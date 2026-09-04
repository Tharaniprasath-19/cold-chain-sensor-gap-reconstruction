import { SensorReading, ConnectivityStatus } from '../../types';
import { LegInfo } from './groundTruth';

export interface SimulatedSensorMeta {
  sensorId: string;
  serialNumber: string;
  type: string;
  clockSkewSeconds: number; // Device clock skew offset
  calibrationOffset: number; // Calibration bias in °C
  noiseFactor: number; // Sensor-specific noise multiplier
  initialBattery: number;
}

export function createSimulatedSensorMeta(
  sensorId: string,
  serialNumber: string,
  type: string,
  rng: () => number,
  maxSkewSeconds: number = 30,
  maxDriftC: number = 0.5
): SimulatedSensorMeta {
  const clockSkewSeconds = Math.round((rng() - 0.5) * 2 * maxSkewSeconds);
  const calibrationOffset = (rng() - 0.5) * 2 * maxDriftC;
  const noiseFactor = 0.8 + rng() * 0.4;
  const initialBattery = 85 + Math.floor(rng() * 15);

  return {
    sensorId,
    serialNumber,
    type,
    clockSkewSeconds,
    calibrationOffset,
    noiseFactor,
    initialBattery,
  };
}

export function generateSensorTelemetryPoint(
  readingIndex: number,
  totalReadings: number,
  realTimestampMs: number,
  groundTruthTemp: number,
  shipmentId: string,
  sensorMeta: SimulatedSensorMeta,
  leg: LegInfo,
  progressRatio: number,
  rng: () => number
): SensorReading {
  // Device timestamp realism: apply clock skew
  const deviceTimestampMs = realTimestampMs + (sensorMeta.clockSkewSeconds * 1000);
  const timestampIso = new Date(deviceTimestampMs).toISOString();

  // Interpolate GPS Location
  const lat = leg.startLat + (leg.endLat - leg.startLat) * progressRatio;
  const lng = leg.startLng + (leg.endLng - leg.startLng) * progressRatio;

  // Physical Environmental Readings
  // Humidity drops when doors open during customs/handover
  let humidity = 88 + (rng() - 0.5) * 6;
  if (leg.name === 'Customs Inspection' || leg.name === 'Port Cargo Staging') {
    humidity = 72 + (rng() - 0.5) * 10;
  }

  // Shock (g-force) & Tilt (degrees)
  let shock = 0.05 + rng() * 0.08;
  let tilt = (rng() - 0.5) * 4;

  // Shock spikes during loading / truck transport bumps
  if (progressRatio < 0.08 || progressRatio > 0.92) {
    shock = 1.4 + rng() * 1.2; // Cargo forklift / crane loading shock
    tilt = (rng() - 0.5) * 14;
  } else if (leg.name === 'Reefer Truck Transport' && rng() > 0.85) {
    shock = 0.6 + rng() * 0.5; // Road vibration / pothole
  }

  // Signal strength (dBm) & connectivity status
  let signalStrength = -62 + Math.floor((rng() - 0.5) * 16);
  let connectivityStatus: ConnectivityStatus = 'Connected';

  if (leg.name === 'Ocean Vessel Transit' || leg.name === 'Air Freight Cargo') {
    signalStrength = -105 + Math.floor((rng() - 0.5) * 20);
    connectivityStatus = 'Buffered';
  } else if (leg.name === 'Customs Inspection' && progressRatio > 0.4 && progressRatio < 0.7) {
    signalStrength = -118;
    connectivityStatus = 'Outage';
  }

  // Battery discharge curve
  const batteryLevel = Math.max(
    5,
    Math.round(sensorMeta.initialBattery - (readingIndex / totalReadings) * 12)
  );

  return {
    id: `rdg-sim-${shipmentId}-${sensorMeta.sensorId}-${readingIndex}`,
    shipment_id: shipmentId,
    sensor_id: sensorMeta.sensorId,
    timestamp: timestampIso,
    ground_truth_temperature: groundTruthTemp,
    observed_temperature: groundTruthTemp, // Will be modified by gapInjector if noise/drift/dropped
    temperature: groundTruthTemp,
    humidity: Number(humidity.toFixed(1)),
    shock: Number(shock.toFixed(2)),
    tilt: Number(tilt.toFixed(1)),
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
    signal_strength: signalStrength,
    battery_level: batteryLevel,
    connectivity_status: connectivityStatus,
    status: 'Observed',
    clock_skew_seconds: sensorMeta.clockSkewSeconds,
    leg_name: leg.name,

    // Legacy backwards compatibility properties
    sensorId: sensorMeta.sensorId,
    shipmentId: shipmentId,
    isObserved: true,
    isReconstructed: false,
    locationName: `${leg.name}`,
  };
}
