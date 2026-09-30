import { 
  createStoreAndForwardSession,
  simulateNetworkDrop,
  recordReadingLocally,
  simulateNetworkRestored,
  synchronizeBuffer,
  runScenario4OutageExcursionSimulation,
  generateFailureScenarioReports
} from '../storeAndForwardEngine';

function runStoreAndForwardTests() {
  console.log('🧪 Running Store-and-Forward & Failure Handling Unit Tests...\n');
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

  // TEST 1: Buffer Creation
  {
    const session = createStoreAndForwardSession('SHP-SIM-8891', 'sns-1');
    assert(session.state === 'CONNECTED', 'Test 1: Initial state is CONNECTED');
    assert(session.bufferedReadings.length === 0, 'Test 1: Buffer is initially empty');
    assert(session.syncCount === 0, 'Test 1: Initial sync count is 0');
  }

  // TEST 2: Offline Readings & Buffer Addition
  {
    let session = createStoreAndForwardSession('SHP-SIM-8891', 'sns-1');
    session = simulateNetworkDrop(session, '2026-09-04T10:00:00Z');

    assert(session.state === 'BUFFERING_LOCALLY', 'Test 2: State switches to BUFFERING_LOCALLY on network drop');
    assert(session.outageStartTime === '2026-09-04T10:00:00Z', 'Test 2: Outage start time recorded');

    session = recordReadingLocally(session, {
      timestamp: '2026-09-04T10:05:00Z',
      temperature: 1.5,
      groundTruthTemp: 1.5,
    });

    assert(session.bufferedReadings.length === 1, 'Test 2: Reading stored locally in buffer');
    assert(session.bufferedReadings[0].temperature === 1.5, 'Test 2: Recorded temperature matches 1.5°C');
    assert(session.bufferedReadings[0].isSynced === false, 'Test 2: isSynced is false while offline');
  }

  // TEST 3: Buffer Persistence
  {
    let session = createStoreAndForwardSession('SHP-SIM-8891', 'sns-1');
    session = simulateNetworkDrop(session, '2026-09-04T10:00:00Z');

    const temps = [1.2, 1.8, 3.4, 4.2, 5.1];
    temps.forEach((t, i) => {
      session = recordReadingLocally(session, {
        timestamp: `2026-09-04T10:0${i * 5}:00Z`,
        temperature: t,
        groundTruthTemp: t,
      });
    });

    assert(session.bufferedReadings.length === 5, 'Test 3: All 5 sequential readings persisted in buffer');
    assert(session.bufferedReadings[4].temperature === 5.1, 'Test 3: FIFO order preserved, 5th reading is 5.1°C');
  }

  // TEST 4: Network Recovery
  {
    let session = createStoreAndForwardSession('SHP-SIM-8891', 'sns-1');
    session = simulateNetworkDrop(session, '2026-09-04T10:00:00Z');
    session = recordReadingLocally(session, { timestamp: '2026-09-04T10:05:00Z', temperature: 2.0, groundTruthTemp: 2.0 });
    
    session = simulateNetworkRestored(session, '2026-09-04T10:30:00Z');

    assert(session.state === 'NETWORK_RESTORED', 'Test 4: State transitions to NETWORK_RESTORED');
    assert(session.networkRestoredTime === '2026-09-04T10:30:00Z', 'Test 4: Network restored timestamp recorded');
    assert(session.bufferedReadings.length === 1, 'Test 4: Buffer preserved during network restoration');
  }

  // TEST 5: Synchronization & Sync Count
  {
    let session = createStoreAndForwardSession('SHP-SIM-8891', 'sns-1');
    session = simulateNetworkDrop(session, '2026-09-04T10:00:00Z');
    session = recordReadingLocally(session, { timestamp: '2026-09-04T10:05:00Z', temperature: 1.5, groundTruthTemp: 1.5 });
    session = recordReadingLocally(session, { timestamp: '2026-09-04T10:10:00Z', temperature: 2.5, groundTruthTemp: 2.5 });
    session = recordReadingLocally(session, { timestamp: '2026-09-04T10:15:00Z', temperature: 3.5, groundTruthTemp: 3.5 });

    session = simulateNetworkRestored(session, '2026-09-04T10:20:00Z');
    const { session: syncedSession, syncedReadings } = synchronizeBuffer(session, '2026-09-04T10:21:00Z');

    assert(syncedSession.state === 'SYNC_COMPLETE', 'Test 5: State transitions to SYNC_COMPLETE');
    assert(syncedSession.syncCount === 3, 'Test 5: Sync count reflects 3 synchronized packets');
    assert(syncedReadings.length === 3, 'Test 5: Returned 3 SensorReading objects for cloud ingestion');
    assert(syncedReadings.every(r => r.status === 'Observed' && r.connectivity_status === 'Connected'), 'Test 5: Synced readings marked Observed and Connected');
    assert(syncedSession.lastSuccessfulSync === '2026-09-04T10:21:00Z', 'Test 5: Last successful sync timestamp recorded');
  }

  // TEST 6: Sync Lag Calculation
  {
    let session = createStoreAndForwardSession('SHP-SIM-8891', 'sns-1');
    session = simulateNetworkDrop(session, '2026-09-04T10:00:00Z');
    // First reading recorded at 10:05:00Z
    session = recordReadingLocally(session, { timestamp: '2026-09-04T10:05:00Z', temperature: 1.5, groundTruthTemp: 1.5 });
    // Synced at 10:35:00Z (30 minutes = 1800 seconds lag)
    const { session: syncedSession } = synchronizeBuffer(session, '2026-09-04T10:35:00Z');

    assert(syncedSession.syncLagSeconds === 1800, 'Test 6: Sync lag accurately computed as 1800 seconds (30 minutes)');
  }

  // TEST 7: Temperature Excursion Preservation (Excursion NOT smoothed away)
  {
    let session = createStoreAndForwardSession('SHP-SIM-8891', 'sns-1');
    session = simulateNetworkDrop(session, '2026-09-04T10:00:00Z');

    // Temperatures rise during tarmac unplugged state: 1.0 -> 3.2 -> 6.2 -> 5.8 -> 2.0
    const excursionCurve = [1.2, 3.2, 6.2, 5.8, 2.0];
    excursionCurve.forEach((temp, i) => {
      session = recordReadingLocally(session, {
        timestamp: `2026-09-04T10:${10 + i * 5}:00Z`,
        temperature: temp,
        groundTruthTemp: temp,
      }, 2.0);
    });

    assert(session.excursionDetectedDuringOutage === true, 'Test 7: Excursion flagged during local buffering');
    assert(session.peakExcursionTemp === 6.2, 'Test 7: Peak recorded excursion is 6.2°C');

    // Synchronize buffer
    const { syncedReadings } = synchronizeBuffer(session, '2026-09-04T10:40:00Z');
    const peakSynced = Math.max(...syncedReadings.map(r => r.observed_temperature!));

    assert(peakSynced === 6.2, 'Test 7: CRITICAL — Peak 6.2°C temperature excursion preserved after sync without smoothing!');
  }

  // TEST 8: Full End-to-End Scenario 4 Outage Excursion Timeline
  {
    const simResult = runScenario4OutageExcursionSimulation();

    assert(simResult.timeline.length >= 7, 'Test 8: Full 7-stage lifecycle timeline generated');
    assert(simResult.timeline[0].stage === 'Connected', 'Test 8: Stage 1 is Connected');
    assert(simResult.timeline[1].stage === 'Network Lost', 'Test 8: Stage 2 is Network Lost');
    assert(simResult.timeline.some(t => t.stage === 'Temperature Excursion'), 'Test 8: Stage Temperature Excursion exists in timeline');
    assert(simResult.timeline.some(t => t.stage === 'Network Restored'), 'Test 8: Stage Network Restored exists in timeline');
    assert(simResult.timeline.some(t => t.stage === 'Sync'), 'Test 8: Stage Sync exists in timeline');
    assert(simResult.timeline[simResult.timeline.length - 1].stage === 'Recovered Data', 'Test 8: Final stage is Recovered Data');
    assert(simResult.excursionPreserved === true, 'Test 8: Excursion preserved is true');
    assert(simResult.peakRecordedTemp === 6.2, 'Test 8: Peak recorded temp is 6.2°C');
  }

  // TEST 9: Failure Case Lab Reports Generation
  {
    const reports = generateFailureScenarioReports();
    assert(reports.SCENARIO_1_TOTAL_DROPOUT !== undefined, 'Test 9: Scenario 1 report exists');
    assert(reports.SCENARIO_2_MISCALIBRATED_SENSOR !== undefined, 'Test 9: Scenario 2 report exists');
    assert(reports.SCENARIO_3_CONFLICTING_SENSORS !== undefined, 'Test 9: Scenario 3 report exists');
    assert(reports.SCENARIO_4_OUTAGE_EXCURSION !== undefined, 'Test 9: Scenario 4 report exists');
    assert(reports.SCENARIO_3_CONFLICTING_SENSORS.expectedBehavior.includes('NOT blindly average'), 'Test 9: Scenario 3 explicitly enforces no blind averaging');
  }

  console.log(`\n🎉 Results: ${passed}/${total} store-and-forward & failure handling tests passed cleanly.\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runStoreAndForwardTests();
