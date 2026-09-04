import { SensorReading, Gap, GapType, ThermalRiskCategory } from '../../types';

export function detectGaps(
  readings: SensorReading[],
  expectedPingIntervalMinutes: number = 5
): Gap[] {
  const gaps: Gap[] = [];
  const toleranceMs = (expectedPingIntervalMinutes + 2) * 60 * 1000;

  // Group readings by shipment_id -> sensor_id
  const shipmentSensorMap = new Map<string, Map<string, SensorReading[]>>();

  readings.forEach((rdg) => {
    if (!shipmentSensorMap.has(rdg.shipment_id)) {
      shipmentSensorMap.set(rdg.shipment_id, new Map());
    }
    const sensorMap = shipmentSensorMap.get(rdg.shipment_id)!;
    if (!sensorMap.has(rdg.sensor_id)) {
      sensorMap.set(rdg.sensor_id, []);
    }
    sensorMap.get(rdg.sensor_id)!.push(rdg);
  });

  // Process each shipment and sensor timeline
  shipmentSensorMap.forEach((sensorMap, shipmentId) => {
    const allSensorIds = Array.from(sensorMap.keys());

    sensorMap.forEach((sensorReadings, sensorId) => {
      // Sort chronologically
      sensorReadings.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      if (sensorReadings.length === 0) return;

      // 1. Check for Timestamp Gaps & Dropouts
      for (let i = 0; i < sensorReadings.length - 1; i++) {
        const current = sensorReadings[i];
        const next = sensorReadings[i + 1];

        const t1 = new Date(current.timestamp).getTime();
        const t2 = new Date(next.timestamp).getTime();
        const diffMs = t2 - t1;

        if (diffMs > toleranceMs || next.status === 'Dropped' || next.status === 'Buffered') {
          const durationMinutes = Math.round(diffMs / 60000);

          // Calculate preceding and following trends
          const precedingTrend = calcTrend(sensorReadings, i, 'preceding');
          const followingTrend = calcTrend(sensorReadings, i + 1, 'following');

          // Correlated sensors on the same shipment
          const correlatedSensors = allSensorIds.filter((id) => id !== sensorId);

          // Determine Gap Type & Severity
          let gapType: GapType = 'RANDOM_DROPOUT';
          let severity: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
          let cause = 'Random RF packet drop';

          if (durationMinutes > 180) {
            gapType = 'DEAD_SENSOR';
            severity = 'Critical';
            cause = 'Complete sensor node power outage or disconnect';
          } else if (durationMinutes > 45) {
            gapType = 'NETWORK_OUTAGE';
            severity = 'High';
            cause = 'Metal container RF shielding or carrier cell outage';
          } else if (durationMinutes > 15) {
            gapType = 'NETWORK_OUTAGE';
            severity = 'Medium';
            cause = 'Cellular handover delay / temporary buffer';
          } else if (current.signal_strength < -110) {
            gapType = 'LOW_SIGNAL';
            severity = 'Low';
            cause = 'Weak RSSI signal strength (-110 dBm)';
          }

          // Determine Thermal Risk Category
          const thermalRisk = determineThermalRisk(
            current.temperature,
            next.temperature,
            precedingTrend,
            durationMinutes
          );

          // Confidence Score
          const confidence = Math.max(
            50,
            Number((100 - durationMinutes * 0.15 - (gapType === 'DEAD_SENSOR' ? 20 : 0)).toFixed(1))
          );

          gaps.push({
            id: `gap-det-${shipmentId}-${sensorId}-${i}`,
            shipmentId,
            sensorId,
            startTime: current.timestamp,
            endTime: next.timestamp,
            durationMinutes,
            gapType,
            severity,
            cause,
            lastKnownTemperature: current.temperature,
            precedingTrend,
            followingTrend,
            correlatedSensors,
            confidence,
            thermalRisk,
            legName: current.leg_name || 'Port Cargo Staging',
            startTemp: current.temperature,
            endTemp: next.temperature,
            status: severity === 'Critical' ? 'Critical' : 'Reconstructed',
            confidenceScore: confidence,
            locationContext: `${current.leg_name || 'Transport Sector'}`,
            probableCause: cause,
            thermalIntegrityRisk: thermalRisk === 'Confirmed exposure' ? 'Spoil Risk' : thermalRisk === 'Potential exposure' ? 'Excursion Warning' : 'Safe',
          });
        }
      }

      // 2. Detect Suspicious/Noisy Readings
      for (let i = 2; i < sensorReadings.length - 2; i++) {
        const window = sensorReadings.slice(i - 2, i + 3).map((r) => r.temperature);
        const median = getMedian(window);
        const currentTemp = sensorReadings[i].temperature;

        if (Math.abs(currentTemp - median) > 3.0) {
          gaps.push({
            id: `gap-noise-${shipmentId}-${sensorId}-${i}`,
            shipmentId,
            sensorId,
            startTime: sensorReadings[i].timestamp,
            endTime: sensorReadings[i].timestamp,
            durationMinutes: 5,
            gapType: 'NOISY_SENSOR',
            severity: 'Medium',
            cause: 'Transient thermal noise spike (>3.0°C median deviation)',
            lastKnownTemperature: currentTemp,
            precedingTrend: 'Stable',
            followingTrend: 'Stable',
            correlatedSensors: allSensorIds.filter((id) => id !== sensorId),
            confidence: 75.0,
            thermalRisk: 'Potential exposure',
            legName: sensorReadings[i].leg_name,
            startTemp: currentTemp,
            endTemp: currentTemp,
            status: 'Warning',
            confidenceScore: 75.0,
            locationContext: `${sensorReadings[i].leg_name}`,
            probableCause: 'Transient sensor noise spike',
            thermalIntegrityRisk: 'Excursion Warning',
          });
        }
      }

      // 3. Detect Clock Discontinuity / Skew
      const highSkewReadings = sensorReadings.filter((r) => Math.abs(r.clock_skew_seconds) > 25);
      if (highSkewReadings.length > 0) {
        const sample = highSkewReadings[0];
        gaps.push({
          id: `gap-clock-${shipmentId}-${sensorId}`,
          shipmentId,
          sensorId,
          startTime: sample.timestamp,
          endTime: sample.timestamp,
          durationMinutes: 10,
          gapType: 'CLOCK_SKEW',
          severity: 'Low',
          cause: `Sensor RTC clock drift of ${sample.clock_skew_seconds}s`,
          lastKnownTemperature: sample.temperature,
          precedingTrend: 'Stable',
          followingTrend: 'Stable',
          correlatedSensors: allSensorIds.filter((id) => id !== sensorId),
          confidence: 88.0,
          thermalRisk: 'Missing',
          legName: sample.leg_name,
          startTemp: sample.temperature,
          endTemp: sample.temperature,
          status: 'Observed',
          confidenceScore: 88.0,
          locationContext: `${sample.leg_name}`,
          probableCause: 'RTC clock drift offset',
          thermalIntegrityRisk: 'Safe',
        });
      }
    });
  });

  return gaps;
}

// Helper: Calculate preceding or following trend
function calcTrend(
  readings: SensorReading[],
  idx: number,
  direction: 'preceding' | 'following'
): 'Stable' | 'Warming' | 'Cooling' {
  const windowSize = 3;
  let subset: SensorReading[];

  if (direction === 'preceding') {
    subset = readings.slice(Math.max(0, idx - windowSize), idx + 1);
  } else {
    subset = readings.slice(idx, Math.min(readings.length, idx + windowSize + 1));
  }

  if (subset.length < 2) return 'Stable';

  const first = subset[0].temperature;
  const last = subset[subset.length - 1].temperature;
  const diff = last - first;

  if (diff > 0.8) return 'Warming';
  if (diff < -0.8) return 'Cooling';
  return 'Stable';
}

// Helper: Determine Thermal Risk Category
function determineThermalRisk(
  lastTemp: number,
  nextTemp: number,
  precedingTrend: 'Stable' | 'Warming' | 'Cooling',
  durationMinutes: number
): ThermalRiskCategory {
  if (lastTemp > 3.0 || nextTemp > 3.0) {
    return 'Confirmed exposure';
  }
  if (precedingTrend === 'Warming' || durationMinutes > 120) {
    return 'Potential exposure';
  }
  if (durationMinutes > 45) {
    return 'Unknown';
  }
  return 'Missing';
}

// Helper: Calculate median of array
function getMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
