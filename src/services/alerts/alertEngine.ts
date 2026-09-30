import { 
  SensorReading, 
  Sensor, 
  Shipment, 
  Gap, 
  Alert, 
  AlertConfig, 
  AlertClassification, 
  AlertSource, 
  ThresholdTradeoffPoint, 
  SensorReliabilityMetrics,
  ReconstructionPointResult 
} from '../../types';
import { reconstructShipmentGaps } from '../reconstruction/reconstructionEngine';

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  temperatureThreshold: 2.0, // °C
  exposureDurationMinutes: 20, // 20 minutes
  minConfidenceThreshold: 75, // 75%
  useShipmentTargetMax: false,
  shipmentId: 'all',
};

/**
 * Calculates sensor reliability score based on calibration status, battery level, and signal RSSI.
 */
export function getSensorReliability(sensor?: Sensor): SensorReliabilityMetrics {
  if (!sensor) {
    return {
      sensorId: 'unknown',
      reliabilityScore: 0.90,
      calibrationFactor: 0.90,
      batteryFactor: 0.90,
      signalFactor: 0.90,
      isReliable: true,
      notes: 'Default sensor profile',
    };
  }

  // Calibration status evaluation
  let calibrationFactor = 1.0;
  if (sensor.calibrationStatus === 'Due Soon') {
    calibrationFactor = 0.88;
  } else if (sensor.calibrationStatus === 'Expired') {
    calibrationFactor = 0.65;
  }

  // Battery health evaluation
  let batteryFactor = 1.0;
  if (sensor.batteryLevel < 10) {
    batteryFactor = 0.55;
  } else if (sensor.batteryLevel < 20) {
    batteryFactor = 0.80;
  } else if (sensor.batteryLevel < 40) {
    batteryFactor = 0.92;
  }

  // Signal RSSI evaluation
  let signalFactor = 1.0;
  if (sensor.signalStrengthRssi < -105) {
    signalFactor = 0.70;
  } else if (sensor.signalStrengthRssi < -85) {
    signalFactor = 0.88;
  }

  const score = Number((calibrationFactor * 0.45 + batteryFactor * 0.35 + signalFactor * 0.20).toFixed(2));
  const isReliable = score >= 0.75;

  let notes = 'NIST-traceable calibration valid, healthy battery & signal.';
  if (sensor.calibrationStatus === 'Expired') {
    notes = 'Calibration expired: sensor measurements subject to potential drift penalty.';
  } else if (sensor.batteryLevel < 20) {
    notes = 'Low battery: ADC voltage reference stability may be degraded.';
  } else if (sensor.signalStrengthRssi < -100) {
    notes = 'Weak RF signal: packet loss and timestamp jitter observed.';
  }

  return {
    sensorId: sensor.id,
    reliabilityScore: score,
    calibrationFactor,
    batteryFactor,
    signalFactor,
    isReliable,
    notes,
  };
}

/**
 * Evaluates a single continuous sequence of points or single observation for testing and classification.
 */
export function evaluateBreachEpisode(
  points: {
    timestamp: string;
    temperature: number | null;
    status: 'OBSERVED' | 'RECONSTRUCTED' | 'UNKNOWN';
    confidence: number; // 0.0 to 1.0 or 0 to 100
    lowerBound?: number | null;
    upperBound?: number | null;
  }[],
  config: AlertConfig,
  sensor?: Sensor,
  shipmentId: string = 'shp-1',
  sensorId: string = 'sns-1'
): Alert {
  const threshold = config.temperatureThreshold;
  const sensorReliability = getSensorReliability(sensor);

  if (points.length === 0) {
    return {
      id: `alt-none-${Date.now()}`,
      shipmentId,
      sensorId,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      durationMinutes: 0,
      maximumTemperature: 0,
      threshold,
      confidence: 100,
      status: 'NO_ALERT',
      source: 'Observed',
      reason: 'No telemetry points to evaluate.',
      recommendedAction: 'None: Within acceptable thermal limits.',
    };
  }

  const validPoints = points.filter(p => p.temperature !== null);
  const startTime = points[0].timestamp;
  const endTime = points[points.length - 1].timestamp;

  const durationMinutes = Math.max(
    5,
    Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000) + 5
  );

  const maxTemp = validPoints.length > 0 
    ? Math.max(...validPoints.map(p => p.temperature!))
    : 0;

  // Check if points are below threshold
  const isBreached = validPoints.some(p => p.temperature! >= threshold);

  if (!isBreached || durationMinutes < config.exposureDurationMinutes) {
    return {
      id: `alt-no-breach-${shipmentId}-${sensorId}-${Date.now()}`,
      shipmentId,
      sensorId,
      startTime,
      endTime,
      durationMinutes,
      maximumTemperature: Number(maxTemp.toFixed(1)),
      threshold,
      confidence: 100,
      status: 'NO_ALERT',
      source: points.every(p => p.status === 'OBSERVED') ? 'Observed' : 'Reconstructed',
      reason: !isBreached 
        ? `Peak temperature ${maxTemp.toFixed(1)}°C did not breach threshold of ${threshold}°C.`
        : `Breach duration of ${durationMinutes} min is below required threshold duration of ${config.exposureDurationMinutes} min.`,
      recommendedAction: 'None: Within acceptable thermal limits or excursion transient.',
    };
  }

  // Count source types
  const observedCount = points.filter(p => p.status === 'OBSERVED').length;
  const reconstructedCount = points.filter(p => p.status === 'RECONSTRUCTED').length;

  let source: AlertSource = 'Observed';
  if (observedCount === 0) {
    source = 'Reconstructed';
  } else if (reconstructedCount > 0) {
    source = 'Hybrid';
  }

  // Calculate average point confidence (normalizing 0-1 to 0-100)
  const rawConfidences = points.map(p => p.confidence <= 1.0 ? p.confidence * 100 : p.confidence);
  const avgConf = rawConfidences.reduce((a, b) => a + b, 0) / rawConfidences.length;
  const effectiveConfidence = Math.round(avgConf * sensorReliability.reliabilityScore);

  let status: AlertClassification = 'CONFIRMED_EXPOSURE';
  let reason = '';
  let recommendedAction = '';
  let isFalseAlarmCandidate = false;

  // RULE 1: Direct observed breach + sufficient duration
  if (source === 'Observed') {
    if (sensorReliability.reliabilityScore >= 0.70) {
      status = 'CONFIRMED_EXPOSURE';
      reason = `Direct telemetry breach exceeding ${threshold}°C for ${durationMinutes} min (peak ${maxTemp.toFixed(1)}°C). High sensor reliability (${Math.round(sensorReliability.reliabilityScore * 100)}%).`;
      recommendedAction = 'Immediate Quarantine: Reject container upon arrival, initiate spoilage inspection, file carrier cold-chain claim.';
    } else {
      status = 'LOW_CONFIDENCE_ANOMALY';
      isFalseAlarmCandidate = true;
      reason = `Direct observed breach detected, but sensor reliability is degraded (${sensorReliability.notes}).`;
      recommendedAction = 'Secondary Sensor Audit: Cross-check companion loggers before filing claim.';
    }
  } 
  // RULE 2: Reconstructed breach + high confidence
  else if (source === 'Reconstructed') {
    if (effectiveConfidence >= config.minConfidenceThreshold) {
      status = 'POSSIBLE_EXPOSURE';
      reason = `Reconstructed breach exceeding ${threshold}°C for ${durationMinutes} min with ${effectiveConfidence}% confidence. Spatial/trend evidence indicates probable excursion.`;
      recommendedAction = 'Priority Arrival Inspection: Perform core probe temperature test and organoleptic quality check at port receiving dock.';
    } else {
      // RULE 3: Reconstructed breach + low confidence
      status = 'LOW_CONFIDENCE_ANOMALY';
      isFalseAlarmCandidate = true;
      reason = `Reconstructed breach of ${maxTemp.toFixed(1)}°C detected during sensor blackout, but confidence is low (${effectiveConfidence}% < ${config.minConfidenceThreshold}%). High uncertainty bounds.`;
      recommendedAction = 'Telemetry Review: Secondary sensor audit recommended; do not penalize carrier or discard shipment without physical verification.';
    }
  } 
  // RULE 4: Hybrid breach
  else {
    // If observed portion alone meets duration requirement
    const observedPoints = points.filter(p => p.status === 'OBSERVED');
    let observedDuration = 0;
    if (observedPoints.length > 0) {
      const obsStart = new Date(observedPoints[0].timestamp).getTime();
      const obsEnd = new Date(observedPoints[observedPoints.length - 1].timestamp).getTime();
      observedDuration = Math.round((obsEnd - obsStart) / 60000) + 5;
    }

    if (observedDuration >= config.exposureDurationMinutes && sensorReliability.reliabilityScore >= 0.70) {
      status = 'CONFIRMED_EXPOSURE';
      reason = `Hybrid event confirmed by direct observed readings lasting ${observedDuration} min (peak ${maxTemp.toFixed(1)}°C).`;
      recommendedAction = 'Immediate Quarantine: Reject container upon arrival, initiate spoilage inspection, file carrier cold-chain claim.';
    } else if (effectiveConfidence >= config.minConfidenceThreshold) {
      status = 'POSSIBLE_EXPOSURE';
      reason = `Hybrid breach sustained for ${durationMinutes} min with ${effectiveConfidence}% overall confidence.`;
      recommendedAction = 'Priority Arrival Inspection: Perform core probe temperature test and organoleptic quality check at port receiving dock.';
    } else {
      status = 'LOW_CONFIDENCE_ANOMALY';
      isFalseAlarmCandidate = true;
      reason = `Hybrid breach detected during intermittent blackout, but confidence is low (${effectiveConfidence}% < ${config.minConfidenceThreshold}%).`;
      recommendedAction = 'Telemetry Review: Reconstructed breach has low confidence; do not reject container without physical probe validation.';
    }
  }

  // Uncertainty lower bound check: if lower bound is below threshold, it's a false alarm candidate
  const hasLowerBoundBelowThreshold = points.some(p => p.lowerBound !== undefined && p.lowerBound !== null && p.lowerBound < threshold);
  if (hasLowerBoundBelowThreshold && status === 'POSSIBLE_EXPOSURE') {
    isFalseAlarmCandidate = true;
  }

  const alertId = `alt-${shipmentId}-${sensorId}-${new Date(startTime).getTime()}`;

  return {
    id: alertId,
    shipmentId,
    sensorId,
    startTime,
    endTime,
    durationMinutes,
    maximumTemperature: Number(maxTemp.toFixed(1)),
    threshold,
    confidence: effectiveConfidence,
    status,
    source,
    reason,
    recommendedAction,
    shipmentCode: shipmentId,
    severity: status === 'CONFIRMED_EXPOSURE' ? 'Critical' : status === 'POSSIBLE_EXPOSURE' ? 'Warning' : 'Info',
    title: status === 'CONFIRMED_EXPOSURE' 
      ? 'Confirmed Temperature Breach' 
      : status === 'POSSIBLE_EXPOSURE' 
      ? 'Probable Reconstructed Exposure' 
      : 'Low-Confidence Telemetry Anomaly',
    description: reason,
    timestamp: endTime,
    triggerValue: `${maxTemp.toFixed(1)} °C (${durationMinutes}m)`,
    isFalseAlarmCandidate,
  };
}

/**
 * Scans a reconstructed point stream for continuous breach sequences and produces formal Alert objects.
 */
export function detectExcursionsFromPoints(
  points: ReconstructionPointResult[],
  config: AlertConfig,
  sensor?: Sensor,
  shipmentId: string = 'shp-1',
  sensorId: string = 'sns-1'
): Alert[] {
  const alerts: Alert[] = [];
  const threshold = config.temperatureThreshold;

  let currentBreachPoints: ReconstructionPointResult[] = [];

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const isBreach = pt.estimatedTemperature !== null && pt.estimatedTemperature >= threshold;

    if (isBreach) {
      currentBreachPoints.push(pt);
    } else {
      if (currentBreachPoints.length > 0) {
        // Episode ended, evaluate it
        const alert = evaluateBreachEpisode(
          currentBreachPoints.map(p => ({
            timestamp: p.timestamp,
            temperature: p.estimatedTemperature,
            status: p.status,
            confidence: p.confidence,
            lowerBound: p.lowerBound,
            upperBound: p.upperBound,
          })),
          config,
          sensor,
          shipmentId,
          sensorId
        );

        if (alert.status !== 'NO_ALERT') {
          alerts.push(alert);
        }
        currentBreachPoints = [];
      }
    }
  }

  // Handle trailing breach episode
  if (currentBreachPoints.length > 0) {
    const alert = evaluateBreachEpisode(
      currentBreachPoints.map(p => ({
        timestamp: p.timestamp,
        temperature: p.estimatedTemperature,
        status: p.status,
        confidence: p.confidence,
        lowerBound: p.lowerBound,
        upperBound: p.upperBound,
      })),
      config,
      sensor,
      shipmentId,
      sensorId
    );

    if (alert.status !== 'NO_ALERT') {
      alerts.push(alert);
    }
  }

  return alerts;
}

/**
 * Evaluates alerts for a specific shipment across its sensors.
 */
export function evaluateShipmentAlerts(
  readings: SensorReading[],
  gaps: Gap[],
  shipment: Shipment,
  sensors: Sensor[],
  config: AlertConfig
): Alert[] {
  const shipmentSensors = sensors.filter(s => s.currentShipmentId === shipment.id);
  const alerts: Alert[] = [];

  // Effective threshold: either configured threshold or targetTempMax
  const effectiveConfig: AlertConfig = {
    ...config,
    temperatureThreshold: config.useShipmentTargetMax ? shipment.targetTempMax : config.temperatureThreshold,
  };

  const reeferSetpoint = (shipment.targetTempMin + shipment.targetTempMax) / 2;

  // Process sensors for this shipment
  const targetSensors = shipmentSensors.length > 0 ? shipmentSensors : sensors.slice(0, 1);

  for (const sns of targetSensors) {
    const recResult = reconstructShipmentGaps(
      readings,
      gaps,
      shipment.id,
      sns.id,
      reeferSetpoint
    );

    const sensorAlerts = detectExcursionsFromPoints(
      recResult.points,
      effectiveConfig,
      sns,
      shipment.id,
      sns.id
    );

    for (const alt of sensorAlerts) {
      alt.shipmentCode = shipment.code;
      alerts.push(alt);
    }
  }

  return alerts;
}

/**
 * Evaluates alerts across the entire fleet of shipments according to config.
 */
export function evaluateFleetAlerts(
  readings: SensorReading[],
  gaps: Gap[],
  shipments: Shipment[],
  sensors: Sensor[],
  config: AlertConfig
): Alert[] {
  let targetShipments = shipments;
  if (config.shipmentId && config.shipmentId !== 'all') {
    targetShipments = shipments.filter(s => s.id === config.shipmentId);
  }

  const allAlerts: Alert[] = [];

  for (const shp of targetShipments) {
    const shpAlerts = evaluateShipmentAlerts(readings, gaps, shp, sensors, config);
    allAlerts.push(...shpAlerts);
  }

  // Sort by startTime descending
  return allAlerts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

/**
 * Calculates False Positive, False Negative, Confirmed Exposures, and Possible Exposures
 * dynamically by comparing Alert Engine output against Ground Truth temperatures across a threshold sweep.
 */
export function calculateThresholdTradeoffs(
  readings: SensorReading[],
  gaps: Gap[],
  shipments: Shipment[],
  sensors: Sensor[],
  baseConfig: AlertConfig,
  customRange?: { min: number; max: number; step: number }
): ThresholdTradeoffPoint[] {
  // Filter shipments based on config scope
  const targetShipments = (baseConfig.shipmentId && baseConfig.shipmentId !== 'all')
    ? shipments.filter(s => s.id === baseConfig.shipmentId)
    : shipments;

  // Determine threshold sweep range
  let minT = 0.0;
  let maxT = 6.0;
  let step = 0.5;

  if (customRange) {
    minT = customRange.min;
    maxT = customRange.max;
    step = customRange.step;
  } else {
    // Determine bounds from readings
    const relevantReadings = readings.filter(r => targetShipments.some(s => s.id === r.shipment_id));
    if (relevantReadings.length > 0) {
      const allGroundTruthTemps = relevantReadings.map(r => r.ground_truth_temperature);
      const minObs = Math.min(...allGroundTruthTemps);
      const maxObs = Math.max(...allGroundTruthTemps);
      
      // If dataset contains frozen seafood (e.g. -22°C) vs chilled (+2°C), tailor range
      if (minObs < -5) {
        minT = Math.floor(minObs);
        maxT = Math.ceil(maxObs);
        step = Math.max(1.0, Math.round((maxT - minT) / 15));
      } else {
        minT = Math.max(-1.0, Math.floor(minObs));
        maxT = Math.min(8.0, Math.ceil(maxObs) + 1.0);
        step = 0.5;
      }
    }
  }

  const results: ThresholdTradeoffPoint[] = [];

  // Pre-calculate reconstruction streams for target shipments
  const reconstructedStreams = new Map<string, { shipment: Shipment; sensor: Sensor; points: ReconstructionPointResult[]; groundTruths: number[] }>();

  for (const shp of targetShipments) {
    const shpSensors = sensors.filter(s => s.currentShipmentId === shp.id);
    const primarySensor = shpSensors[0] || sensors[0];
    if (!primarySensor) continue;

    const setpoint = (shp.targetTempMin + shp.targetTempMax) / 2;
    const recResult = reconstructShipmentGaps(readings, gaps, shp.id, primarySensor.id, setpoint);

    // Map timestamps to ground truth temperatures
    const sensorReadings = readings.filter(r => r.shipment_id === shp.id && r.sensor_id === primarySensor.id);
    const rdgMap = new Map(sensorReadings.map(r => [r.timestamp, r.ground_truth_temperature]));

    const groundTruths = recResult.points.map(p => rdgMap.get(p.timestamp) ?? p.estimatedTemperature ?? 0.0);

    reconstructedStreams.set(`${shp.id}-${primarySensor.id}`, {
      shipment: shp,
      sensor: primarySensor,
      points: recResult.points,
      groundTruths,
    });
  }

  // Sweep through thresholds
  for (let t = minT; t <= maxT + 0.001; t += step) {
    const currentThreshold = Number(t.toFixed(1));
    const sweepConfig: AlertConfig = {
      ...baseConfig,
      temperatureThreshold: currentThreshold,
    };

    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    let trueNegatives = 0;

    let confirmedExposures = 0;
    let possibleExposures = 0;
    let lowConfidenceCount = 0;
    let totalAlerts = 0;

    // Evaluate each stream
    for (const [, stream] of reconstructedStreams) {
      const { points, groundTruths, sensor, shipment } = stream;
      const alerts = detectExcursionsFromPoints(points, sweepConfig, sensor, shipment.id, sensor.id);

      for (const alt of alerts) {
        if (alt.status === 'CONFIRMED_EXPOSURE') confirmedExposures++;
        else if (alt.status === 'POSSIBLE_EXPOSURE') possibleExposures++;
        else if (alt.status === 'LOW_CONFIDENCE_ANOMALY') lowConfidenceCount++;
        totalAlerts++;
      }

      // Time-window evaluation (15-min rolling intervals)
      // Step through time points and compare Ground Truth breach vs Actionable Alert breach
      const windowSize = Math.max(1, Math.floor(baseConfig.exposureDurationMinutes / 5));

      for (let i = 0; i < points.length; i += windowSize) {
        const sliceGT = groundTruths.slice(i, i + windowSize);
        const slicePoints = points.slice(i, i + windowSize);

        // Ground Truth breached if all readings in window >= threshold
        const gtBreach = sliceGT.length >= windowSize && sliceGT.every(temp => temp >= currentThreshold);

        // Alert Engine flagged exposure in this window if covered by CONFIRMED or POSSIBLE alert
        const sliceStart = slicePoints[0]?.timestamp;
        const sliceEnd = slicePoints[slicePoints.length - 1]?.timestamp;

        const isAlerted = alerts.some(alt => 
          (alt.status === 'CONFIRMED_EXPOSURE' || alt.status === 'POSSIBLE_EXPOSURE') &&
          new Date(alt.startTime).getTime() <= new Date(sliceEnd).getTime() &&
          new Date(alt.endTime).getTime() >= new Date(sliceStart).getTime()
        );

        if (gtBreach && isAlerted) {
          truePositives++;
        } else if (!gtBreach && isAlerted) {
          falsePositives++;
        } else if (gtBreach && !isAlerted) {
          falseNegatives++;
        } else {
          trueNegatives++;
        }
      }
    }

    const totalNegatives = falsePositives + trueNegatives;
    const totalPositives = truePositives + falseNegatives;

    const fpr = totalNegatives > 0 ? Number(((falsePositives / totalNegatives) * 100).toFixed(1)) : 0;
    const fnr = totalPositives > 0 ? Number(((falseNegatives / totalPositives) * 100).toFixed(1)) : 0;

    results.push({
      threshold: currentThreshold,
      falsePositives,
      falseNegatives,
      truePositives,
      trueNegatives,
      falsePositiveRate: fpr,
      falseNegativeRate: fnr,
      confirmedExposures,
      possibleExposures,
      lowConfidenceCount,
      totalAlerts,
    });
  }

  return results;
}
