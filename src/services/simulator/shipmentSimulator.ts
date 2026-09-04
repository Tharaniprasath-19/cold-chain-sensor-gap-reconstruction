import { 
  Shipment, 
  Sensor, 
  SensorReading, 
  Gap, 
  SimulationConfig, 
  SimulationSummary 
} from '../../types';
import { createPRNG, generateGroundTruthTemperature, LegInfo } from './groundTruth';
import { createSimulatedSensorMeta, generateSensorTelemetryPoint, SimulatedSensorMeta } from './sensorSimulator';
import { injectGapsAndNoise } from './gapInjector';

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  seed: 42,
  numShipments: 5,
  numSensorsPerShipment: 2,
  pingIntervalMinutes: 5,
  dropoutProbability: 0.12, // 12% random drop rate
  noiseLevel: 0.2, // 0.2°C std dev
  deadSensorProbability: 0.15, // 15% chance a sensor dies on a leg
  clockSkewMaxSeconds: 30, // max 30s device clock skew
  calibrationDriftMax: 0.4, // max 0.4°C drift
  networkOutageDurationMinutes: 60,
};

export interface SimulationResult {
  shipments: Shipment[];
  sensors: Sensor[];
  readings: SensorReading[];
  gaps: Gap[];
  summary: SimulationSummary;
  config: SimulationConfig;
}

interface ExportRouteSpec {
  code: string;
  product: string;
  productCategory: string;
  origin: string;
  destination: string;
  carrier: string;
  targetTempMin: number;
  targetTempMax: number;
  legs: LegInfo[];
}

const ROUTE_SPECS: ExportRouteSpec[] = [
  {
    code: 'SHP-SIM-8891',
    product: 'Sashimi-Grade Yellowfin Tuna Loins',
    productCategory: 'Fresh Ultra-Chilled Seafood',
    origin: 'Colombo Export Hub, Sri Lanka',
    destination: 'Narita Intl Airport, Tokyo, Japan',
    carrier: 'Emirates SkyCargo / OceanCold',
    targetTempMin: -1.5,
    targetTempMax: 1.5,
    legs: [
      { name: 'Cold Storage Facility', durationMinutes: 180, baseTemp: -0.5, tempVariance: 0.3, startLat: 6.9271, startLng: 79.8612, endLat: 6.9300, endLng: 79.8650 },
      { name: 'Reefer Truck Transport', durationMinutes: 120, baseTemp: 0.2, tempVariance: 0.4, startLat: 6.9300, startLng: 79.8650, endLat: 7.1808, endLng: 79.8841 },
      { name: 'Port Cargo Staging', durationMinutes: 150, baseTemp: 1.2, tempVariance: 0.8, startLat: 7.1808, startLng: 79.8841, endLat: 7.1820, endLng: 79.8850 },
      { name: 'Air Freight Cargo', durationMinutes: 480, baseTemp: -0.2, tempVariance: 0.3, startLat: 7.1820, startLng: 79.8850, endLat: 35.7720, endLng: 140.3929 },
      { name: 'Customs Inspection', durationMinutes: 240, baseTemp: 2.1, tempVariance: 1.2, startLat: 35.7720, startLng: 140.3929, endLat: 35.7740, endLng: 140.3950 },
      { name: 'Destination Distribution Center', durationMinutes: 180, baseTemp: 0.0, tempVariance: 0.2, startLat: 35.7740, startLng: 140.3950, endLat: 35.6762, endLng: 139.6503 },
    ],
  },
  {
    code: 'SHP-SIM-8892',
    product: 'Deep-Frozen Norwegian Salmon Fillets',
    productCategory: 'Frozen Super-Chill Seafood',
    origin: 'Bergen Processing Hub, Norway',
    destination: 'Port of Los Angeles, USA',
    carrier: 'Maersk Line Refrigerated',
    targetTempMin: -22.0,
    targetTempMax: -18.0,
    legs: [
      { name: 'Cold Storage Facility', durationMinutes: 240, baseTemp: -21.5, tempVariance: 0.4, startLat: 60.3913, startLng: 5.3221, endLat: 60.3950, endLng: 5.3280 },
      { name: 'Port Cargo Staging', durationMinutes: 180, baseTemp: -19.8, tempVariance: 0.6, startLat: 60.3950, startLng: 5.3280, endLat: 60.4000, endLng: 5.3300 },
      { name: 'Ocean Vessel Transit', durationMinutes: 1440, baseTemp: -20.8, tempVariance: 0.3, startLat: 60.4000, startLng: 5.3300, endLat: 33.7405, endLng: -118.2723 },
      { name: 'Customs Inspection', durationMinutes: 210, baseTemp: -18.4, tempVariance: 0.8, startLat: 33.7405, startLng: -118.2723, endLat: 33.7450, endLng: -118.2750 },
      { name: 'Reefer Truck Transport', durationMinutes: 120, baseTemp: -20.2, tempVariance: 0.4, startLat: 33.7450, startLng: -118.2750, endLat: 34.0522, endLng: -118.2437 },
    ],
  },
  {
    code: 'SHP-SIM-8893',
    product: 'Live Alaskan Red King Crab (Oxygenated)',
    productCategory: 'Live Crustacean Export',
    origin: 'Dutch Harbor Depot, Alaska, USA',
    destination: 'Changi Logistics Depot, Singapore',
    carrier: 'Pacific Aero Cargo',
    targetTempMin: 3.5,
    targetTempMax: 6.5,
    legs: [
      { name: 'Cold Storage Facility', durationMinutes: 120, baseTemp: 4.2, tempVariance: 0.3, startLat: 53.8883, startLng: -166.5422, endLat: 53.8900, endLng: -166.5400 },
      { name: 'Reefer Truck Transport', durationMinutes: 180, baseTemp: 4.8, tempVariance: 0.5, startLat: 53.8900, startLng: -166.5400, endLat: 53.9000, endLng: -166.5300 },
      { name: 'Air Freight Cargo', durationMinutes: 720, baseTemp: 4.5, tempVariance: 0.4, startLat: 53.9000, startLng: -166.5300, endLat: 1.3644, endLng: 103.9915 },
      { name: 'Customs Inspection', durationMinutes: 150, baseTemp: 5.4, tempVariance: 0.6, startLat: 1.3644, startLng: 103.9915, endLat: 1.3660, endLng: 103.9930 },
    ],
  },
  {
    code: 'SHP-SIM-8894',
    product: 'Black Tiger Prawns (Head-On IQF)',
    productCategory: 'Frozen Super-Chill Seafood',
    origin: 'Galle Export Harbor, Sri Lanka',
    destination: 'Frankfurt CargoCity, Germany',
    carrier: 'DHL Global Forwarding',
    targetTempMin: -20.0,
    targetTempMax: -16.0,
    legs: [
      { name: 'Cold Storage Facility', durationMinutes: 180, baseTemp: -19.2, tempVariance: 0.4, startLat: 6.0535, startLng: 80.2210, endLat: 6.0550, endLng: 80.2230 },
      { name: 'Port Cargo Staging', durationMinutes: 300, baseTemp: -12.4, tempVariance: 1.5, startLat: 6.0550, startLng: 80.2230, endLat: 6.0600, endLng: 80.2250 },
      { name: 'Air Freight Cargo', durationMinutes: 600, baseTemp: -18.5, tempVariance: 0.5, startLat: 6.0600, startLng: 80.2250, endLat: 50.0379, endLng: 8.5622 },
      { name: 'Customs Inspection', durationMinutes: 180, baseTemp: -16.8, tempVariance: 0.7, startLat: 50.0379, startLng: 8.5622, endLat: 50.0400, endLng: 8.5650 },
    ],
  },
  {
    code: 'SHP-SIM-8895',
    product: 'Wild Chilean Sea Bass Fillets',
    productCategory: 'Fresh Ultra-Chilled Seafood',
    origin: 'San Antonio Port Terminal, Chile',
    destination: 'Sydney Kingsford Smith, Australia',
    carrier: 'LATAM Air Cargo',
    targetTempMin: -1.0,
    targetTempMax: 2.0,
    legs: [
      { name: 'Cold Storage Facility', durationMinutes: 150, baseTemp: 0.2, tempVariance: 0.3, startLat: -33.5929, startLng: -71.6127, endLat: -33.5950, endLng: -71.6150 },
      { name: 'Reefer Truck Transport', durationMinutes: 210, baseTemp: 0.8, tempVariance: 0.5, startLat: -33.5950, startLng: -71.6150, endLat: -33.3928, endLng: -70.7858 },
      { name: 'Air Freight Cargo', durationMinutes: 840, baseTemp: 0.4, tempVariance: 0.3, startLat: -33.3928, startLng: -70.7858, endLat: -33.9399, endLng: 151.1753 },
      { name: 'Customs Inspection', durationMinutes: 180, baseTemp: 1.1, tempVariance: 0.4, startLat: -33.9399, startLng: 151.1753, endLat: -33.9420, endLng: 151.1770 },
    ],
  },
];

export function runShipmentSimulation(userConfig: Partial<SimulationConfig> = {}): SimulationResult {
  const config: SimulationConfig = { ...DEFAULT_SIMULATION_CONFIG, ...userConfig };
  const rng = createPRNG(config.seed);

  const startTimeMs = new Date('2026-09-04T00:00:00Z').getTime();

  const shipments: Shipment[] = [];
  const sensors: Sensor[] = [];
  const rawReadings: SensorReading[] = [];
  const sensorsMetaMap = new Map<string, SimulatedSensorMeta>();

  const numRoutesToSimulate = Math.min(config.numShipments, ROUTE_SPECS.length);

  for (let rIdx = 0; rIdx < numRoutesToSimulate; rIdx++) {
    const spec = ROUTE_SPECS[rIdx];
    const shipmentId = `shp-sim-${rIdx + 101}`;

    const shipmentSensorIds: string[] = [];

    // Create 2-3 sensors per shipment
    for (let sIdx = 0; sIdx < config.numSensorsPerShipment; sIdx++) {
      const sensorId = `sns-sim-${rIdx + 101}-${sIdx + 1}`;
      const serialNum = `SN-${rIdx + 101}-${String.fromCharCode(65 + sIdx)}`;
      const nodeType = sIdx === 0 ? 'IoT Gateway' : sIdx === 1 ? 'BLE Sensor Node' : 'Satellite Thermal Tracker';

      const sensorMeta = createSimulatedSensorMeta(
        sensorId,
        serialNum,
        nodeType,
        rng,
        config.clockSkewMaxSeconds,
        config.calibrationDriftMax
      );
      sensorsMetaMap.set(sensorId, sensorMeta);
      shipmentSensorIds.push(sensorId);

      sensors.push({
        id: sensorId,
        serialNumber: serialNum,
        model: sIdx === 0 ? 'ColdGuard Pro-IoT 5G' : 'ThermaBeacon Low-Power Probe',
        type: nodeType,
        status: 'Healthy',
        batteryLevel: sensorMeta.initialBattery,
        signalStrengthRssi: -65,
        lastPing: new Date(startTimeMs + 24 * 3600 * 1000).toISOString(),
        location: spec.origin,
        currentShipmentId: shipmentId,
        calibrationStatus: 'Valid',
        lastCalibrationDate: '2026-06-01',
      });
    }

    // Calculate total route time
    let routeTimeMs = startTimeMs;
    const totalLegsMinutes = spec.legs.reduce((acc, l) => acc + l.durationMinutes, 0);
    let cumulativeLegMinutes = 0;

    // Generate telemetry readings along each leg
    for (let legIdx = 0; legIdx < spec.legs.length; legIdx++) {
      const leg = spec.legs[legIdx];
      const legSteps = Math.floor(leg.durationMinutes / config.pingIntervalMinutes);

      for (let step = 0; step < legSteps; step++) {
        const stepRatio = step / (legSteps || 1);
        const overallRatio = (cumulativeLegMinutes + step * config.pingIntervalMinutes) / totalLegsMinutes;

        const currentTimestampMs = routeTimeMs;
        routeTimeMs += config.pingIntervalMinutes * 60 * 1000;

        // Internal ground truth physical temperature
        const groundTruthTemp = generateGroundTruthTemperature(stepRatio, leg, overallRatio, rng);

        // Generate reading for each sensor attached to this shipment
        shipmentSensorIds.forEach((sensorId) => {
          const meta = sensorsMetaMap.get(sensorId)!;
          const reading = generateSensorTelemetryPoint(
            rawReadings.length,
            1000,
            currentTimestampMs,
            groundTruthTemp,
            shipmentId,
            meta,
            leg,
            stepRatio,
            rng
          );
          rawReadings.push(reading);
        });
      }
      cumulativeLegMinutes += leg.durationMinutes;
    }

    // Build Shipment record
    const lastRdg = rawReadings[rawReadings.length - 1];
    const isExcursion = spec.code === 'SHP-SIM-8894' || spec.code === 'SHP-SIM-8891';

    shipments.push({
      id: shipmentId,
      code: spec.code,
      product: spec.product,
      productCategory: spec.productCategory,
      origin: spec.origin,
      destination: spec.destination,
      currentLeg: spec.legs[spec.legs.length - 2]?.name || 'Customs Inspection',
      temperatureStatus: isExcursion ? 'Warning' : 'Healthy',
      sensorStatus: isExcursion ? 'Warning' : 'Healthy',
      confidence: isExcursion ? 82.5 : 96.4,
      riskLevel: isExcursion ? 'High' : 'Low',
      targetTempMin: spec.targetTempMin,
      targetTempMax: spec.targetTempMax,
      currentTemp: lastRdg ? lastRdg.temperature : spec.targetTempMin + 1.0,
      totalVolumeKg: 4500 + rIdx * 3500,
      exportCertNumber: `LK-CERT-2026-${8890 + rIdx}`,
      carrier: spec.carrier,
      createdDate: new Date(startTimeMs).toISOString(),
      estimatedArrival: new Date(routeTimeMs).toISOString(),
      sensorIds: shipmentSensorIds,
      gapCount: 0,
    });
  }

  // Inject Gaps, Noise & Outages
  const processedReadings = injectGapsAndNoise(rawReadings, sensorsMetaMap, config, rng);

  // Derive Gaps and update gapCount
  const gaps: Gap[] = [];
  const gapCounterMap = new Map<string, number>();

  let activeGapStart: SensorReading | null = null;
  for (let i = 0; i < processedReadings.length; i++) {
    const rdg = processedReadings[i];
    if (rdg.status === 'Dropped' || rdg.status === 'Buffered') {
      if (!activeGapStart) activeGapStart = rdg;
    } else if (activeGapStart) {
      const startMs = new Date(activeGapStart.timestamp).getTime();
      const endMs = new Date(rdg.timestamp).getTime();
      const durationMins = Math.round((endMs - startMs) / 60000);

      if (durationMins >= 15) {
        const gapId = `gap-sim-${gaps.length + 1}`;
        const gType = durationMins > 180 ? 'DEAD_SENSOR' : 'NETWORK_OUTAGE';
        const sev = durationMins > 180 ? 'Critical' : durationMins > 60 ? 'High' : 'Medium';
        const risk = durationMins > 180 ? 'Potential exposure' : 'Missing';
        const causeStr = durationMins > 120 ? 'Metal Shielding & RF Disconnection' : 'Handover Power Disconnect';
        const confVal = Math.max(60, Number((100 - durationMins * 0.1).toFixed(1)));

        gaps.push({
          id: gapId,
          shipmentId: rdg.shipment_id,
          sensorId: rdg.sensor_id,
          startTime: activeGapStart.timestamp,
          endTime: rdg.timestamp,
          durationMinutes: durationMins,
          gapType: gType,
          severity: sev,
          cause: causeStr,
          lastKnownTemperature: activeGapStart.ground_truth_temperature,
          precedingTrend: 'Stable',
          followingTrend: 'Stable',
          correlatedSensors: [],
          confidence: confVal,
          thermalRisk: risk,
          legName: rdg.leg_name,
          startTemp: activeGapStart.ground_truth_temperature,
          endTemp: rdg.ground_truth_temperature,
          locationContext: `${rdg.leg_name} Sector`,
          probableCause: causeStr,
          status: durationMins > 180 ? 'Critical' : 'Reconstructed',
          confidenceScore: confVal,
          thermalIntegrityRisk: durationMins > 180 ? 'Excursion Warning' : 'Safe',
        });
        gapCounterMap.set(rdg.shipment_id, (gapCounterMap.get(rdg.shipment_id) || 0) + 1);
      }
      activeGapStart = null;
    }
  }

  // Update gapCount on shipments
  shipments.forEach(s => {
    s.gapCount = gapCounterMap.get(s.id) || 0;
  });

  const totalGaps = gaps.length;
  const summary: SimulationSummary = {
    totalReadings: processedReadings.length,
    totalGaps,
    totalSensors: sensors.length,
    totalShipments: shipments.length,
    seed: config.seed,
    generatedAt: new Date().toISOString(),
  };

  return {
    shipments,
    sensors,
    readings: processedReadings,
    gaps,
    summary,
    config,
  };
}
