import { SensorReading, SimulationConfig } from '../../types';
import { SimulatedSensorMeta } from './sensorSimulator';

// Box-Muller transform for Gaussian (normal) random numbers
function gaussianNoise(rng: () => number, stdDev: number): number {
  if (stdDev <= 0) return 0;
  const u1 = Math.max(1e-10, rng());
  const u2 = rng();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev;
}

export function injectGapsAndNoise(
  readings: SensorReading[],
  sensorsMeta: Map<string, SimulatedSensorMeta>,
  config: SimulationConfig,
  rng: () => number
): SensorReading[] {
  const result: SensorReading[] = [];

  // Determine if any sensor dies completely during a leg
  const deadSensorsSet = new Set<string>();
  sensorsMeta.forEach((_meta, sensorId) => {
    if (rng() < config.deadSensorProbability) {
      deadSensorsSet.add(sensorId);
    }
  });

  // Track active network outage bursts per sensor
  const outageCounters = new Map<string, number>();

  for (let i = 0; i < readings.length; i++) {
    const rdg = { ...readings[i] };
    const meta = sensorsMeta.get(rdg.sensor_id);

    // Scenario 3: Completely Dead Sensor for a journey leg (e.g. Customs or Vessel leg)
    if (deadSensorsSet.has(rdg.sensor_id) && (rdg.leg_name === 'Customs Inspection' || rdg.leg_name === 'Port Cargo Staging')) {
      rdg.observed_temperature = null;
      rdg.status = 'Dropped';
      rdg.isObserved = false;
      rdg.connectivity_status = 'Offline';
      rdg.battery_level = 0;
      result.push(rdg);
      continue;
    }

    // Scenario 5: Network Outage continuous burst
    let inOutage = (outageCounters.get(rdg.sensor_id) || 0) > 0;
    if (!inOutage && rdg.connectivity_status === 'Outage' && rng() < 0.3) {
      // Start an outage burst (e.g., 8-20 readings)
      const outageLen = Math.floor(6 + rng() * 14);
      outageCounters.set(rdg.sensor_id, outageLen);
      inOutage = true;
    }

    if (inOutage) {
      const remaining = outageCounters.get(rdg.sensor_id)! - 1;
      outageCounters.set(rdg.sensor_id, remaining);

      // Half buffered, half dropped
      if (rng() < 0.5) {
        rdg.status = 'Buffered';
        rdg.connectivity_status = 'Buffered';
        rdg.isObserved = true;
      } else {
        rdg.status = 'Dropped';
        rdg.observed_temperature = null;
        rdg.isObserved = false;
        rdg.connectivity_status = 'Offline';
      }
      result.push(rdg);
      continue;
    }

    // Scenario 1: Random dropped reading based on config dropoutProbability
    if (rng() < config.dropoutProbability) {
      rdg.status = 'Dropped';
      rdg.observed_temperature = null;
      rdg.isObserved = false;
      rdg.connectivity_status = 'Offline';
      result.push(rdg);
      continue;
    }

    // Scenario 4 & 6: Observed reading with Calibration Drift & Gaussian Noise
    const drift = meta ? meta.calibrationOffset : 0;
    const noise = gaussianNoise(rng, config.noiseLevel);
    const noisyObserved = rdg.ground_truth_temperature + drift + noise;

    rdg.observed_temperature = Number(noisyObserved.toFixed(2));
    rdg.temperature = rdg.observed_temperature; // Display temperature
    rdg.status = 'Observed';
    rdg.isObserved = true;

    result.push(rdg);
  }

  return result;
}
