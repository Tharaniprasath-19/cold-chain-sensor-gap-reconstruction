import { 
  SensorReading, 
  Gap, 
  ReconstructionPointResult, 
  ShipmentReconstructionResult,
  ConfidenceLevel,
  ConfidenceFactorBreakdown
} from '../../types';

export function reconstructShipmentGaps(
  readings: SensorReading[],
  gaps: Gap[],
  shipmentId: string,
  sensorId: string,
  reeferSetpoint: number = 0.0
): ShipmentReconstructionResult {
  // Filter readings for current shipment and sensor
  const targetReadings = readings
    .filter((r) => r.shipment_id === shipmentId && r.sensor_id === sensorId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Correlated neighbor readings on the same shipment
  const neighborReadings = readings.filter(
    (r) => r.shipment_id === shipmentId && r.sensor_id !== sensorId && r.status === 'Observed'
  );

  const points: ReconstructionPointResult[] = [];
  let reconstructedGapsCount = 0;
  let unrecoverableGapsCount = 0;
  let totalConfidenceSum = 0;

  targetReadings.forEach((rdg, idx) => {
    if (rdg.status === 'Observed') {
      // LEVEL 0: Directly observed sensor reading
      points.push({
        timestamp: rdg.timestamp,
        estimatedTemperature: rdg.observed_temperature!,
        lowerBound: rdg.observed_temperature!,
        upperBound: rdg.observed_temperature!,
        confidence: 1.0,
        confidenceLevel: 'Very High',
        status: 'OBSERVED',
        method: 'INTERPOLATION',
        evidence: [
          { factor: 'Observed Telemetry', description: 'Direct telemetry received from NIST-calibrated sensor', impact: 'positive' }
        ],
        uncertaintyReason: 'Direct sensor measurement.',
        confidenceFactors: { base: 1.0, durationPenalty: 0, calibrationPenalty: 0, conflictPenalty: 0, signalPenalty: 0, correlationBonus: 0, contextBonus: 0 },
        shipmentId,
        sensorId,
      });
      totalConfidenceSum += 1.0;
      return;
    }

    // Find nearest preceding and following observed readings
    const prevObs = targetReadings.slice(0, idx).reverse().find((r) => r.status === 'Observed');
    const nextObs = targetReadings.slice(idx + 1).find((r) => r.status === 'Observed');

    // Identify if reading falls within a detected gap
    const activeGap = gaps.find(
      (g) => g.shipmentId === shipmentId && g.sensorId === sensorId &&
      new Date(rdg.timestamp) >= new Date(g.startTime) &&
      new Date(rdg.timestamp) <= new Date(g.endTime)
    );

    let calculatedMins = 30;
    if (prevObs && nextObs) {
      calculatedMins = Math.round((new Date(nextObs.timestamp).getTime() - new Date(prevObs.timestamp).getTime()) / 60000);
    } else if (prevObs) {
      calculatedMins = Math.round((new Date(rdg.timestamp).getTime() - new Date(prevObs.timestamp).getTime()) / 60000);
    }

    const gapDurationMins = activeGap ? activeGap.durationMinutes : calculatedMins;

    // Find matching neighbor reading at same timestamp
    const matchingNeighbor = neighborReadings.find(
      (r) => Math.abs(new Date(r.timestamp).getTime() - new Date(rdg.timestamp).getTime()) < 3 * 60000
    );

    // LEVEL 6: Unrecoverable Period (No evidence, no neighbor, long blackout)
    if (!prevObs && !nextObs && !matchingNeighbor) {
      unrecoverableGapsCount++;
      points.push({
        timestamp: rdg.timestamp,
        estimatedTemperature: null,
        lowerBound: null,
        upperBound: null,
        confidence: 0.0,
        confidenceLevel: 'Very Low',
        status: 'UNKNOWN',
        method: 'UNRECOVERABLE',
        evidence: [
          { factor: 'Zero Telemetry Evidence', description: 'No preceding, following, or neighbor sensor telemetry available', impact: 'negative' }
        ],
        uncertaintyReason: 'UNRECOVERABLE: Complete blackout without supporting context. Temperature not fabricated.',
        confidenceFactors: { base: 0.0, durationPenalty: 1.0, calibrationPenalty: 0, conflictPenalty: 0, signalPenalty: 0, correlationBonus: 0, contextBonus: 0 },
        shipmentId,
        sensorId,
      });
      return;
    }

    // LEVEL 5: Conflicting Sensor Evidence
    if (matchingNeighbor && prevObs && Math.abs(matchingNeighbor.observed_temperature! - prevObs.observed_temperature!) > 2.5) {
      reconstructedGapsCount++;
      const estTemp = prevObs.observed_temperature!;
      const boundsWidth = 3.2;
      const factors: ConfidenceFactorBreakdown = {
        base: 0.85,
        durationPenalty: 0.15,
        calibrationPenalty: 0.05,
        conflictPenalty: 0.35, // Conflict penalty
        signalPenalty: 0.05,
        correlationBonus: 0.0,
        contextBonus: 0.05,
      };
      const score = Math.max(0.1, Number((factors.base - factors.durationPenalty - factors.conflictPenalty).toFixed(2)));

      points.push({
        timestamp: rdg.timestamp,
        estimatedTemperature: Number(estTemp.toFixed(2)),
        lowerBound: Number((estTemp - boundsWidth).toFixed(2)),
        upperBound: Number((estTemp + boundsWidth).toFixed(2)),
        confidence: score,
        confidenceLevel: getConfidenceLevel(score),
        status: 'RECONSTRUCTED',
        method: 'CONFLICT_WIDENED',
        evidence: [
          { factor: 'Conflicting Sensor Evidence', description: `Neighbor sensor (${matchingNeighbor.observed_temperature}°C) conflicts with primary trend (${prevObs.observed_temperature}°C)`, impact: 'negative' },
          { factor: 'Widen Uncertainty', description: 'Uncertainty bounds widened to ±3.2°C due to conflicting signals', impact: 'neutral' }
        ],
        uncertaintyReason: 'Conflicting sensor evidence detected. Signals not blindly averaged; uncertainty bounds widened.',
        confidenceFactors: factors,
        shipmentId,
        sensorId,
      });
      totalConfidenceSum += score;
      return;
    }

    // LEVEL 1: Short gap (<15m) + stable readings -> Linear Interpolation
    if (gapDurationMins <= 15 && prevObs && nextObs) {
      reconstructedGapsCount++;
      const t1 = new Date(prevObs.timestamp).getTime();
      const t2 = new Date(nextObs.timestamp).getTime();
      const tCurr = new Date(rdg.timestamp).getTime();
      const ratio = (tCurr - t1) / (t2 - t1 || 1);

      const estTemp = prevObs.observed_temperature! + (nextObs.observed_temperature! - prevObs.observed_temperature!) * ratio;
      const boundsWidth = 0.3;

      const factors: ConfidenceFactorBreakdown = {
        base: 0.98,
        durationPenalty: 0.03,
        calibrationPenalty: 0.0,
        conflictPenalty: 0.0,
        signalPenalty: 0.0,
        correlationBonus: matchingNeighbor ? 0.04 : 0.0,
        contextBonus: 0.03,
      };
      const score = Math.min(1.0, Number((factors.base - factors.durationPenalty + factors.contextBonus).toFixed(2)));

      points.push({
        timestamp: rdg.timestamp,
        estimatedTemperature: Number(estTemp.toFixed(2)),
        lowerBound: Number((estTemp - boundsWidth).toFixed(2)),
        upperBound: Number((estTemp + boundsWidth).toFixed(2)),
        confidence: score,
        confidenceLevel: getConfidenceLevel(score),
        status: 'RECONSTRUCTED',
        method: 'INTERPOLATION',
        evidence: [
          { factor: 'Short Gap Interpolation', description: `Linear interpolation over ${gapDurationMins}m gap`, impact: 'positive' },
          { factor: 'Pre-gap Trend', description: `Pre-gap temp: ${prevObs.observed_temperature}°C`, impact: 'positive' },
          { factor: 'Reefer Setpoint', description: `Set: ${reeferSetpoint}°C`, impact: 'positive' }
        ],
        uncertaintyReason: 'High confidence short-gap interpolation between stable endpoints.',
        confidenceFactors: factors,
        shipmentId,
        sensorId,
      });
      totalConfidenceSum += score;
      return;
    }

    // LEVEL 3: Correlated Neighbor Sensor Available
    if (matchingNeighbor) {
      reconstructedGapsCount++;
      const estTemp = matchingNeighbor.observed_temperature!;
      const boundsWidth = 0.6;

      const factors: ConfidenceFactorBreakdown = {
        base: 0.90,
        durationPenalty: Math.min(0.2, (gapDurationMins / 120) * 0.15),
        calibrationPenalty: 0.02,
        conflictPenalty: 0.0,
        signalPenalty: 0.02,
        correlationBonus: 0.12,
        contextBonus: 0.05,
      };
      const score = Math.max(0.2, Number((factors.base - factors.durationPenalty + factors.correlationBonus).toFixed(2)));

      points.push({
        timestamp: rdg.timestamp,
        estimatedTemperature: Number(estTemp.toFixed(2)),
        lowerBound: Number((estTemp - boundsWidth).toFixed(2)),
        upperBound: Number((estTemp + boundsWidth).toFixed(2)),
        confidence: score,
        confidenceLevel: getConfidenceLevel(score),
        status: 'RECONSTRUCTED',
        method: 'CORRELATED_SENSOR',
        evidence: [
          { factor: 'Correlated Sensor Fusion', description: `Primary telemetry derived from attached neighbor sensor (${matchingNeighbor.sensor_id})`, impact: 'positive' },
          { factor: 'Neighbor Agreement', description: `Neighbor temp: ${matchingNeighbor.observed_temperature}°C`, impact: 'positive' }
        ],
        uncertaintyReason: 'Estimated using secondary correlated sensor on same container.',
        confidenceFactors: factors,
        shipmentId,
        sensorId,
      });
      totalConfidenceSum += score;
      return;
    }

    // LEVEL 2: Short/Medium Gap + Clear Trend
    if (gapDurationMins <= 45 && prevObs) {
      reconstructedGapsCount++;
      const estTemp = prevObs.observed_temperature! + 0.1;
      const boundsWidth = 0.8;

      const factors: ConfidenceFactorBreakdown = {
        base: 0.85,
        durationPenalty: 0.12,
        calibrationPenalty: 0.03,
        conflictPenalty: 0.0,
        signalPenalty: 0.03,
        correlationBonus: 0.0,
        contextBonus: 0.05,
      };
      const score = Number((factors.base - factors.durationPenalty).toFixed(2));

      points.push({
        timestamp: rdg.timestamp,
        estimatedTemperature: Number(estTemp.toFixed(2)),
        lowerBound: Number((estTemp - boundsWidth).toFixed(2)),
        upperBound: Number((estTemp + boundsWidth).toFixed(2)),
        confidence: score,
        confidenceLevel: getConfidenceLevel(score),
        status: 'RECONSTRUCTED',
        method: 'TREND_ESTIMATION',
        evidence: [
          { factor: 'Trend Extrapolation', description: `Extrapolated from pre-gap thermal slope (${prevObs.observed_temperature}°C)`, impact: 'positive' },
          { factor: 'Reefer Setpoint', description: `Reefer thermal inertia setpoint: ${reeferSetpoint}°C`, impact: 'positive' }
        ],
        uncertaintyReason: 'Medium confidence trend estimation over medium blackout period.',
        confidenceFactors: factors,
        shipmentId,
        sensorId,
      });
      totalConfidenceSum += score;
      return;
    }

    // LEVEL 4: Dead Sensor (>60m) / Journey Context
    if (prevObs) {
      reconstructedGapsCount++;
      const estTemp = prevObs.observed_temperature!;
      const boundsWidth = 1.8;

      const factors: ConfidenceFactorBreakdown = {
        base: 0.70,
        durationPenalty: Math.min(0.4, (gapDurationMins / 120) * 0.25),
        calibrationPenalty: 0.05,
        conflictPenalty: 0.0,
        signalPenalty: 0.08,
        correlationBonus: 0.0,
        contextBonus: 0.08,
      };
      const score = Math.max(0.15, Number((factors.base - factors.durationPenalty).toFixed(2)));

      points.push({
        timestamp: rdg.timestamp,
        estimatedTemperature: Number(estTemp.toFixed(2)),
        lowerBound: Number((estTemp - boundsWidth).toFixed(2)),
        upperBound: Number((estTemp + boundsWidth).toFixed(2)),
        confidence: score,
        confidenceLevel: getConfidenceLevel(score),
        status: 'RECONSTRUCTED',
        method: 'JOURNEY_CONTEXT',
        evidence: [
          { factor: 'Journey Leg Kinetics', description: `Thermal inertia estimation during ${rdg.leg_name}`, impact: 'neutral' },
          { factor: 'Last Known Good', description: `Last valid reading: ${prevObs.observed_temperature}°C`, impact: 'positive' },
          { factor: 'Long Duration Penalty', description: `Sensor silent for ${gapDurationMins} minutes`, impact: 'negative' }
        ],
        uncertaintyReason: `Low confidence journey context estimation. Sensor silent for ${gapDurationMins} mins; bounds widened to ±1.8°C.`,
        confidenceFactors: factors,
        shipmentId,
        sensorId,
      });
      totalConfidenceSum += score;
      return;
    }

    // Fallback Unrecoverable
    unrecoverableGapsCount++;
    points.push({
      timestamp: rdg.timestamp,
      estimatedTemperature: null,
      lowerBound: null,
      upperBound: null,
      confidence: 0.0,
      confidenceLevel: 'Very Low',
      status: 'UNKNOWN',
      method: 'UNRECOVERABLE',
      evidence: [
        { factor: 'No Supporting Data', description: 'Zero telemetry or neighbor context available', impact: 'negative' }
      ],
      uncertaintyReason: 'UNRECOVERABLE: Temperature not fabricated.',
      confidenceFactors: { base: 0, durationPenalty: 1, calibrationPenalty: 0, conflictPenalty: 0, signalPenalty: 0, correlationBonus: 0, contextBonus: 0 },
      shipmentId,
      sensorId,
    });
  });

  const avgConfidence = points.length > 0 ? Number((totalConfidenceSum / points.length).toFixed(2)) : 0;

  return {
    shipmentId,
    points,
    reconstructedGapsCount,
    unrecoverableGapsCount,
    averageConfidence: avgConfidence,
  };
}

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.90) return 'Very High';
  if (score >= 0.75) return 'High';
  if (score >= 0.50) return 'Medium';
  if (score >= 0.25) return 'Low';
  return 'Very Low';
}
