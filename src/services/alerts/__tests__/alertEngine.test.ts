import { 
  evaluateBreachEpisode, 
  getSensorReliability,
  calculateThresholdTradeoffs,
  DEFAULT_ALERT_CONFIG 
} from '../alertEngine';
import { Sensor, AlertConfig } from '../../../types';
import { demoSimulationResult } from '../../../data/simulated/demoDataset';
import { detectGaps } from '../../detection/gapDetector';

function runAlertTests() {
  console.log('🧪 Running Confidence-Aware Alert Engine Unit Tests...\n');
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

  const validSensor: Sensor = {
    id: 'sns-test-1',
    serialNumber: 'SN-TEST-A',
    model: 'ColdGuard Pro-IoT 5G',
    type: 'IoT Gateway',
    status: 'Healthy',
    batteryLevel: 95,
    signalStrengthRssi: -65,
    lastPing: '2026-09-04T12:00:00Z',
    location: 'Colombo Export Hub',
    calibrationStatus: 'Valid',
    lastCalibrationDate: '2026-06-01',
  };

  const degradedSensor: Sensor = {
    id: 'sns-test-bad',
    serialNumber: 'SN-TEST-BAD',
    model: 'Old BLE Probe',
    type: 'BLE Sensor Node',
    status: 'Warning',
    batteryLevel: 8,
    signalStrengthRssi: -112,
    lastPing: '2026-09-04T12:00:00Z',
    location: 'Bonded Yard',
    calibrationStatus: 'Expired',
    lastCalibrationDate: '2024-01-01',
  };

  // TEST 1: Confirmed Observed Breach (Direct observed readings + sufficient duration)
  {
    const config: AlertConfig = {
      temperatureThreshold: 5.0,
      exposureDurationMinutes: 20,
      minConfidenceThreshold: 75,
    };

    const points = [
      { timestamp: '2026-09-04T14:20:00Z', temperature: 5.2, status: 'OBSERVED' as const, confidence: 1.0 },
      { timestamp: '2026-09-04T14:25:00Z', temperature: 5.7, status: 'OBSERVED' as const, confidence: 1.0 },
      { timestamp: '2026-09-04T14:30:00Z', temperature: 5.5, status: 'OBSERVED' as const, confidence: 1.0 },
      { timestamp: '2026-09-04T14:35:00Z', temperature: 5.6, status: 'OBSERVED' as const, confidence: 1.0 },
      { timestamp: '2026-09-04T14:40:00Z', temperature: 5.4, status: 'OBSERVED' as const, confidence: 1.0 },
      { timestamp: '2026-09-04T14:45:00Z', temperature: 5.1, status: 'OBSERVED' as const, confidence: 1.0 },
    ];

    const alert = evaluateBreachEpisode(points, config, validSensor, 'SEA-001', 'sns-test-1');

    assert(alert.status === 'CONFIRMED_EXPOSURE', 'Test 1: Status is CONFIRMED_EXPOSURE');
    assert(alert.source === 'Observed', 'Test 1: Source is Observed');
    assert(alert.durationMinutes >= 25, 'Test 1: Duration >= 25 min');
    assert(alert.maximumTemperature === 5.7, 'Test 1: Maximum temperature is 5.7°C');
    assert(alert.confidence >= 90, 'Test 1: Confidence is Very High (>= 90%)');
    assert(alert.recommendedAction.includes('Immediate Quarantine'), 'Test 1: Recommended action advises quarantine');
  }

  // TEST 2: Short Breach (Breach occurs but duration < exposure duration threshold)
  {
    const config: AlertConfig = {
      temperatureThreshold: 5.0,
      exposureDurationMinutes: 20,
      minConfidenceThreshold: 75,
    };

    // 10 minutes duration (< 20 min threshold)
    const points = [
      { timestamp: '2026-09-04T10:00:00Z', temperature: 5.8, status: 'OBSERVED' as const, confidence: 1.0 },
      { timestamp: '2026-09-04T10:05:00Z', temperature: 5.6, status: 'OBSERVED' as const, confidence: 1.0 },
    ];

    const alert = evaluateBreachEpisode(points, config, validSensor, 'SEA-001', 'sns-test-1');

    assert(alert.status === 'NO_ALERT', 'Test 2: Short breach yields NO_ALERT');
    assert(alert.durationMinutes < 20, 'Test 2: Breach duration < 20 min');
    assert(alert.reason.includes('below required threshold duration'), 'Test 2: Reason cites insufficient duration');
  }

  // TEST 3: Reconstructed High-Confidence Breach (Reconstructed + High Confidence >= 75%)
  {
    const config: AlertConfig = {
      temperatureThreshold: 5.0,
      exposureDurationMinutes: 20,
      minConfidenceThreshold: 75,
    };

    // 25 minutes duration, reconstructed from correlated neighbor sensor (confidence 85%)
    const points = [
      { timestamp: '2026-09-04T11:00:00Z', temperature: 5.3, status: 'RECONSTRUCTED' as const, confidence: 0.88, lowerBound: 4.8, upperBound: 5.8 },
      { timestamp: '2026-09-04T11:05:00Z', temperature: 5.5, status: 'RECONSTRUCTED' as const, confidence: 0.88, lowerBound: 5.0, upperBound: 6.0 },
      { timestamp: '2026-09-04T11:10:00Z', temperature: 5.6, status: 'RECONSTRUCTED' as const, confidence: 0.85, lowerBound: 5.1, upperBound: 6.1 },
      { timestamp: '2026-09-04T11:15:00Z', temperature: 5.4, status: 'RECONSTRUCTED' as const, confidence: 0.85, lowerBound: 4.9, upperBound: 5.9 },
      { timestamp: '2026-09-04T11:20:00Z', temperature: 5.2, status: 'RECONSTRUCTED' as const, confidence: 0.85, lowerBound: 4.7, upperBound: 5.7 },
    ];

    const alert = evaluateBreachEpisode(points, config, validSensor, 'SEA-002', 'sns-test-1');

    assert(alert.status === 'POSSIBLE_EXPOSURE', 'Test 3: Status is POSSIBLE_EXPOSURE (not blindly confirmed)');
    assert(alert.source === 'Reconstructed', 'Test 3: Source is Reconstructed');
    assert(alert.confidence >= 75, 'Test 3: Confidence >= 75%');
    assert(alert.recommendedAction.includes('Priority Arrival Inspection'), 'Test 3: Recommended action advises arrival inspection');
  }

  // TEST 4: Reconstructed Low-Confidence Breach (Reconstructed + Low Confidence < 75%)
  {
    const config: AlertConfig = {
      temperatureThreshold: 5.0,
      exposureDurationMinutes: 20,
      minConfidenceThreshold: 75,
    };

    // 25 minutes duration during long blackout with low confidence (48%)
    const points = [
      { timestamp: '2026-09-04T10:15:00Z', temperature: 5.2, status: 'RECONSTRUCTED' as const, confidence: 0.48, lowerBound: 3.4, upperBound: 7.0 },
      { timestamp: '2026-09-04T10:20:00Z', temperature: 5.4, status: 'RECONSTRUCTED' as const, confidence: 0.48, lowerBound: 3.6, upperBound: 7.2 },
      { timestamp: '2026-09-04T10:25:00Z', temperature: 5.3, status: 'RECONSTRUCTED' as const, confidence: 0.48, lowerBound: 3.5, upperBound: 7.1 },
      { timestamp: '2026-09-04T10:30:00Z', temperature: 5.1, status: 'RECONSTRUCTED' as const, confidence: 0.48, lowerBound: 3.3, upperBound: 6.9 },
      { timestamp: '2026-09-04T10:35:00Z', temperature: 5.0, status: 'RECONSTRUCTED' as const, confidence: 0.48, lowerBound: 3.2, upperBound: 6.8 },
    ];

    const alert = evaluateBreachEpisode(points, config, validSensor, 'SEA-002', 'sns-test-1');

    assert(alert.status === 'LOW_CONFIDENCE_ANOMALY', 'Test 4: Status is LOW_CONFIDENCE_ANOMALY');
    assert(alert.confidence < 75, 'Test 4: Confidence < 75%');
    assert(alert.isFalseAlarmCandidate === true, 'Test 4: Flagged as False Alarm Candidate');
    assert(alert.recommendedAction.includes('Telemetry Review'), 'Test 4: Recommended action avoids immediate rejection');
  }

  // TEST 5: Threshold Changes
  {
    const points = [
      { timestamp: '2026-09-04T10:00:00Z', temperature: 3.5, status: 'OBSERVED' as const, confidence: 1.0 },
      { timestamp: '2026-09-04T10:05:00Z', temperature: 3.8, status: 'OBSERVED' as const, confidence: 1.0 },
      { timestamp: '2026-09-04T10:10:00Z', temperature: 3.7, status: 'OBSERVED' as const, confidence: 1.0 },
      { timestamp: '2026-09-04T10:15:00Z', temperature: 3.9, status: 'OBSERVED' as const, confidence: 1.0 },
      { timestamp: '2026-09-04T10:20:00Z', temperature: 3.6, status: 'OBSERVED' as const, confidence: 1.0 },
    ];

    // At threshold 2.0°C: breach occurs
    const configLow: AlertConfig = {
      temperatureThreshold: 2.0,
      exposureDurationMinutes: 20,
      minConfidenceThreshold: 75,
    };
    const alertLow = evaluateBreachEpisode(points, configLow, validSensor, 'SEA-003', 'sns-test-1');
    assert(alertLow.status === 'CONFIRMED_EXPOSURE', 'Test 5: Threshold 2.0°C triggers CONFIRMED_EXPOSURE');

    // When threshold raised to 4.5°C: no breach
    const configHigh: AlertConfig = {
      temperatureThreshold: 4.5,
      exposureDurationMinutes: 20,
      minConfidenceThreshold: 75,
    };
    const alertHigh = evaluateBreachEpisode(points, configHigh, validSensor, 'SEA-003', 'sns-test-1');
    assert(alertHigh.status === 'NO_ALERT', 'Test 5: Raising threshold to 4.5°C suppresses alert to NO_ALERT');
  }

  // TEST 6: Duration Changes
  {
    // Breach lasting 25 minutes
    const points = [
      { timestamp: '2026-09-04T10:00:00Z', temperature: 6.0, status: 'OBSERVED' as const, confidence: 1.0 },
      { timestamp: '2026-09-04T10:05:00Z', temperature: 6.2, status: 'OBSERVED' as const, confidence: 1.0 },
      { timestamp: '2026-09-04T10:10:00Z', temperature: 6.1, status: 'OBSERVED' as const, confidence: 1.0 },
      { timestamp: '2026-09-04T10:15:00Z', temperature: 6.3, status: 'OBSERVED' as const, confidence: 1.0 },
      { timestamp: '2026-09-04T10:20:00Z', temperature: 6.0, status: 'OBSERVED' as const, confidence: 1.0 },
    ];

    // Duration requirement 20 minutes -> triggers alert
    const config20m: AlertConfig = {
      temperatureThreshold: 5.0,
      exposureDurationMinutes: 20,
      minConfidenceThreshold: 75,
    };
    const alert20m = evaluateBreachEpisode(points, config20m, validSensor, 'SEA-004', 'sns-test-1');
    assert(alert20m.status === 'CONFIRMED_EXPOSURE', 'Test 6: 25m breach with 20m threshold triggers CONFIRMED_EXPOSURE');

    // Increasing duration requirement to 45 minutes -> suppresses alert
    const config45m: AlertConfig = {
      temperatureThreshold: 5.0,
      exposureDurationMinutes: 45,
      minConfidenceThreshold: 75,
    };
    const alert45m = evaluateBreachEpisode(points, config45m, validSensor, 'SEA-004', 'sns-test-1');
    assert(alert45m.status === 'NO_ALERT', 'Test 6: Increasing duration threshold to 45m suppresses alert to NO_ALERT');
  }

  // TEST 7: Sensor Reliability Evaluation
  {
    const goodRel = getSensorReliability(validSensor);
    assert(goodRel.isReliable === true, 'Test 7: Valid sensor is marked reliable');
    assert(goodRel.reliabilityScore >= 0.85, 'Test 7: Valid sensor score >= 0.85');

    const badRel = getSensorReliability(degradedSensor);
    assert(badRel.isReliable === false, 'Test 7: Expired/low battery sensor marked not reliable');
    assert(badRel.reliabilityScore < 0.75, 'Test 7: Degraded sensor reliability score < 0.75');

    // A direct breach on degraded sensor is demoted to LOW_CONFIDENCE_ANOMALY
    const points = [
      { timestamp: '2026-09-04T14:20:00Z', temperature: 5.5, status: 'OBSERVED' as const, confidence: 1.0 },
      { timestamp: '2026-09-04T14:25:00Z', temperature: 5.7, status: 'OBSERVED' as const, confidence: 1.0 },
      { timestamp: '2026-09-04T14:30:00Z', temperature: 5.6, status: 'OBSERVED' as const, confidence: 1.0 },
      { timestamp: '2026-09-04T14:35:00Z', temperature: 5.8, status: 'OBSERVED' as const, confidence: 1.0 },
      { timestamp: '2026-09-04T14:40:00Z', temperature: 5.5, status: 'OBSERVED' as const, confidence: 1.0 },
    ];
    const alertDegraded = evaluateBreachEpisode(points, { temperatureThreshold: 5.0, exposureDurationMinutes: 20, minConfidenceThreshold: 75 }, degradedSensor, 'SEA-005', 'sns-test-bad');
    assert(alertDegraded.status === 'LOW_CONFIDENCE_ANOMALY', 'Test 7: Degraded sensor demotes direct breach to LOW_CONFIDENCE_ANOMALY');
  }

  // TEST 8: Ground Truth Threshold Tradeoffs Simulation Calculation
  {
    const detectedGaps = detectGaps(demoSimulationResult.readings, demoSimulationResult.config.pingIntervalMinutes);
    const tradeoffs = calculateThresholdTradeoffs(
      demoSimulationResult.readings,
      detectedGaps,
      demoSimulationResult.shipments.slice(0, 2),
      demoSimulationResult.sensors,
      DEFAULT_ALERT_CONFIG,
      { min: 0.0, max: 4.0, step: 1.0 }
    );

    assert(tradeoffs.length === 5, 'Test 8: Tradeoffs generated 5 threshold steps');
    assert(tradeoffs.every(p => !isNaN(p.falsePositiveRate) && !isNaN(p.falseNegativeRate)), 'Test 8: FPR and FNR are valid numbers without NaN');
    assert(tradeoffs.every(p => p.threshold !== undefined && p.totalAlerts !== undefined), 'Test 8: Tradeoff points have threshold and totalAlerts properties');
  }

  console.log(`\n🎉 Results: ${passed}/${total} alert engine unit tests passed cleanly.\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runAlertTests();
