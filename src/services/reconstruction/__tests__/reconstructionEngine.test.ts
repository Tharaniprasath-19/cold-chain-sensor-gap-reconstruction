import { reconstructShipmentGaps } from '../reconstructionEngine';
import { SensorReading, Gap } from '../../../types';

function createDummyReading(
  timestampIso: string,
  temp: number | null,
  status: 'Observed' | 'Dropped' | 'Buffered' | 'Unknown',
  sensorId: string = 'sns-1',
  shipmentId: string = 'shp-1'
): SensorReading {
  return {
    id: `rdg-${timestampIso}`,
    shipment_id: shipmentId,
    sensor_id: sensorId,
    timestamp: timestampIso,
    ground_truth_temperature: temp ?? 0.0,
    observed_temperature: temp,
    temperature: temp ?? 0.0,
    humidity: 85,
    shock: 0.05,
    tilt: 0.0,
    latitude: 6.9,
    longitude: 79.8,
    signal_strength: -65,
    battery_level: 90,
    connectivity_status: status === 'Dropped' ? 'Offline' : 'Connected',
    status,
    clock_skew_seconds: 0,
    leg_name: 'Customs Inspection',
  };
}

function runTests() {
  console.log('🧪 Running Reconstruction Engine Unit Tests...\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
    }
  }

  // TEST 1: Short Stable Gap (Level 1 Interpolation)
  {
    const readings: SensorReading[] = [
      createDummyReading('2026-09-04T10:00:00Z', 1.0, 'Observed'),
      createDummyReading('2026-09-04T10:05:00Z', null, 'Dropped'),
      createDummyReading('2026-09-04T10:10:00Z', 1.2, 'Observed'),
    ];
    const gaps: Gap[] = [];
    const res = reconstructShipmentGaps(readings, gaps, 'shp-1', 'sns-1');
    const point = res.points[1];

    assert(point.status === 'RECONSTRUCTED', 'Test 1: Status is RECONSTRUCTED');
    assert(point.method === 'INTERPOLATION', 'Test 1: Method is INTERPOLATION');
    assert(point.estimatedTemperature === 1.1, 'Test 1: Interpolated temp is 1.1°C');
    assert(point.confidence >= 0.90, 'Test 1: Confidence is Very High (>= 0.90)');
  }

  // TEST 2: Trending Gap (Level 2 Trend Estimation)
  {
    const readings: SensorReading[] = [
      createDummyReading('2026-09-04T10:00:00Z', 1.0, 'Observed'),
      createDummyReading('2026-09-04T10:25:00Z', null, 'Dropped'),
      createDummyReading('2026-09-04T10:50:00Z', 2.0, 'Observed'),
    ];
    const gaps: Gap[] = [{
      id: 'g-2',
      shipmentId: 'shp-1',
      sensorId: 'sns-1',
      startTime: '2026-09-04T10:00:00Z',
      endTime: '2026-09-04T10:50:00Z',
      durationMinutes: 30,
      gapType: 'NETWORK_OUTAGE',
      severity: 'Medium',
      cause: 'RF signal loss',
      lastKnownTemperature: 1.0,
      precedingTrend: 'Warming',
      followingTrend: 'Warming',
      correlatedSensors: [],
      confidence: 85,
      thermalRisk: 'Potential exposure',
      legName: 'Reefer Truck Transport',
      startTemp: 1.0,
      endTemp: 2.0,
      status: 'Reconstructed',
      confidenceScore: 85,
      locationContext: 'Truck',
      probableCause: 'RF loss',
      thermalIntegrityRisk: 'Safe',
    }];

    const res = reconstructShipmentGaps(readings, gaps, 'shp-1', 'sns-1');
    const point = res.points[1];

    assert(point.method === 'TREND_ESTIMATION', 'Test 2: Method is TREND_ESTIMATION');
    assert(point.confidence >= 0.70 && point.confidence <= 0.89, 'Test 2: Confidence is High (0.70 - 0.89)');
  }

  // TEST 3: Long Gap (Level 4 Journey Context)
  {
    const readings: SensorReading[] = [
      createDummyReading('2026-09-04T10:00:00Z', 1.5, 'Observed'),
      createDummyReading('2026-09-04T12:00:00Z', null, 'Dropped'),
      createDummyReading('2026-09-04T14:00:00Z', 1.8, 'Observed'),
    ];
    const gaps: Gap[] = [{
      id: 'g-3',
      shipmentId: 'shp-1',
      sensorId: 'sns-1',
      startTime: '2026-09-04T10:00:00Z',
      endTime: '2026-09-04T14:00:00Z',
      durationMinutes: 180,
      gapType: 'NETWORK_OUTAGE',
      severity: 'High',
      cause: 'Container blackout',
      lastKnownTemperature: 1.5,
      precedingTrend: 'Stable',
      followingTrend: 'Stable',
      correlatedSensors: [],
      confidence: 50,
      thermalRisk: 'Unknown',
      legName: 'Customs Inspection',
      startTemp: 1.5,
      endTemp: 1.8,
      status: 'Reconstructed',
      confidenceScore: 50,
      locationContext: 'Customs',
      probableCause: 'Container blackout',
      thermalIntegrityRisk: 'Safe',
    }];

    const res = reconstructShipmentGaps(readings, gaps, 'shp-1', 'sns-1');
    const point = res.points[1];

    assert(point.method === 'JOURNEY_CONTEXT', 'Test 3: Method is JOURNEY_CONTEXT');
    assert(point.confidence < 0.70, 'Test 3: Reduced confidence for long 180m gap');
    assert(point.upperBound! - point.lowerBound! >= 3.0, 'Test 3: Widened uncertainty bounds (>= 3.0°C)');
  }

  // TEST 4: Dead Sensor (Level 4)
  {
    const readings: SensorReading[] = [
      createDummyReading('2026-09-04T10:00:00Z', 2.0, 'Observed'),
      createDummyReading('2026-09-04T13:00:00Z', null, 'Dropped'),
    ];
    const gaps: Gap[] = [{
      id: 'g-4',
      shipmentId: 'shp-1',
      sensorId: 'sns-1',
      startTime: '2026-09-04T10:00:00Z',
      endTime: '2026-09-04T13:00:00Z',
      durationMinutes: 240,
      gapType: 'DEAD_SENSOR',
      severity: 'Critical',
      cause: 'Battery failure',
      lastKnownTemperature: 2.0,
      precedingTrend: 'Stable',
      followingTrend: 'Stable',
      correlatedSensors: [],
      confidence: 40,
      thermalRisk: 'Unknown',
      legName: 'Ocean Vessel Transit',
      startTemp: 2.0,
      endTemp: 2.0,
      status: 'Critical',
      confidenceScore: 40,
      locationContext: 'Vessel',
      probableCause: 'Battery failure',
      thermalIntegrityRisk: 'Safe',
    }];

    const res = reconstructShipmentGaps(readings, gaps, 'shp-1', 'sns-1');
    const point = res.points[1];

    assert(point.status === 'RECONSTRUCTED', 'Test 4: Dead sensor yields RECONSTRUCTED with reduced confidence');
    assert(point.confidence < 0.60, 'Test 4: Dead sensor confidence < 0.60');
  }

  // TEST 5: Miscalibrated Sensor Penalty
  {
    const readings: SensorReading[] = [
      createDummyReading('2026-09-04T10:00:00Z', 1.0, 'Observed'),
      createDummyReading('2026-09-04T10:30:00Z', null, 'Dropped'),
    ];
    const res = reconstructShipmentGaps(readings, [], 'shp-1', 'sns-1');
    const point = res.points[1];

    assert(point.confidenceFactors.calibrationPenalty >= 0, 'Test 5: Calibration factor tracked in breakdown');
  }

  // TEST 6: Conflicting Sensors (Level 5 Widen Uncertainty)
  {
    const readings: SensorReading[] = [
      createDummyReading('2026-09-04T10:00:00Z', 1.0, 'Observed', 'sns-primary'),
      createDummyReading('2026-09-04T10:15:00Z', null, 'Dropped', 'sns-primary'),
      createDummyReading('2026-09-04T10:15:00Z', 4.5, 'Observed', 'sns-neighbor'), // +3.5°C conflict
    ];
    const res = reconstructShipmentGaps(readings, [], 'shp-1', 'sns-primary');
    const point = res.points[1];

    assert(point.method === 'CONFLICT_WIDENED', 'Test 6: Method is CONFLICT_WIDENED');
    assert(point.confidenceFactors.conflictPenalty > 0, 'Test 6: Conflict penalty applied (> 0)');
    assert(point.upperBound! - point.lowerBound! > 5.0, 'Test 6: Uncertainty bounds widened significantly');
  }

  // TEST 7: No Supporting Data (Level 6 Unrecoverable)
  {
    const readings: SensorReading[] = [
      createDummyReading('2026-09-04T10:00:00Z', null, 'Dropped', 'sns-solo'),
    ];
    const res = reconstructShipmentGaps(readings, [], 'shp-1', 'sns-solo');
    const point = res.points[0];

    assert(point.status === 'UNKNOWN', 'Test 7: Status is UNKNOWN for unrecoverable period');
    assert(point.method === 'UNRECOVERABLE', 'Test 7: Method is UNRECOVERABLE');
    assert(point.estimatedTemperature === null, 'Test 7: estimatedTemperature is null (no fake temp!)');
    assert(point.confidence === 0.0, 'Test 7: Confidence is 0.0');
  }

  console.log(`\n🎉 Results: ${passed}/${total} unit tests passed cleanly.\n`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
