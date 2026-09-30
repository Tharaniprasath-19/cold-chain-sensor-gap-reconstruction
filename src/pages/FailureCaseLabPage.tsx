import React, { useState } from 'react';
import { 
  FailureScenarioId, 
  StoreAndForwardState, 
  StoreAndForwardSession 
} from '../types';
import { 
  generateFailureScenarioReports, 
  runScenario4OutageExcursionSimulation,
  createStoreAndForwardSession,
  simulateNetworkDrop,
  recordReadingLocally,
  simulateNetworkRestored,
  synchronizeBuffer
} from '../services/storeAndForward/storeAndForwardEngine';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { KPICard } from '../components/KPICard';
import {
  FlaskConical,
  Play,
  RotateCcw,
  WifiOff,
  Wifi,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Thermometer,
  Layers,
  ArrowRight,
  Info,
  Clock,
  Radio,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';

export const FailureCaseLabPage: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<FailureScenarioId>('SCENARIO_4_OUTAGE_EXCURSION');

  // Scenario 4 interactive state
  const [s4State, setS4State] = useState<StoreAndForwardState>('CONNECTED');
  const [s4Step, setS4Step] = useState<number>(0);
  const [s4Session, setS4Session] = useState<StoreAndForwardSession>(createStoreAndForwardSession());
  const [s4Timeline, setS4Timeline] = useState<any[]>([]);

  // Scenario 1 interactive state
  const [s1Ran, setS1Ran] = useState<boolean>(false);

  // Scenario 2 interactive state
  const [s2Ran, setS2Ran] = useState<boolean>(false);
  const [s2ShowGroundTruth, setS2ShowGroundTruth] = useState<boolean>(true);

  // Scenario 3 interactive state
  const [s3Ran, setS3Ran] = useState<boolean>(false);

  // Static scenario reports
  const scenarioReports = generateFailureScenarioReports();
  const currentReport = scenarioReports[activeScenario];

  // Helper to run full Scenario 4 simulation
  const handleRunScenario4Full = () => {
    const res = runScenario4OutageExcursionSimulation();
    setS4Session(res.session);
    setS4Timeline(res.timeline);
    setS4State('SYNC_COMPLETE');
    setS4Step(7);
  };

  const handleResetScenario4 = () => {
    setS4Session(createStoreAndForwardSession());
    setS4Timeline([]);
    setS4State('CONNECTED');
    setS4Step(0);
  };

  // Step-by-step runner for Scenario 4
  const handleStepScenario4 = () => {
    const baseTimeMs = new Date('2026-09-04T10:00:00Z').getTime();

    if (s4Step === 0) {
      // Step 1: Connected
      const point = {
        stage: 'Connected',
        timestamp: new Date(baseTimeMs).toISOString(),
        temperature: 1.0,
        networkState: 'CONNECTED' as StoreAndForwardState,
        eventDescription: 'Normal wireless telemetry stream connected. Ambient: 1.0°C.',
      };
      setS4Timeline([point]);
      setS4State('CONNECTED');
      setS4Step(1);
    } else if (s4Step === 1) {
      // Step 2: Network Lost
      const outageTime = new Date(baseTimeMs + 5 * 60000).toISOString();
      const updated = simulateNetworkDrop(s4Session, outageTime);
      setS4Session(updated);
      setS4State('NETWORK_OFFLINE');
      setS4Timeline(prev => [
        ...prev,
        {
          stage: 'Network Lost',
          timestamp: outageTime,
          temperature: 1.2,
          networkState: 'NETWORK_OFFLINE',
          eventDescription: 'Entered metal bonded warehouse. Cellular RF link dropped.',
        }
      ]);
      setS4Step(2);
    } else if (s4Step >= 2 && s4Step <= 4) {
      // Step 3-5: Buffering locally while temperature rises
      const temps = [2.2, 4.8, 6.2];
      const temp = temps[s4Step - 2];
      const readingTime = new Date(baseTimeMs + (10 + (s4Step - 2) * 10) * 60000).toISOString();
      const updated = recordReadingLocally(s4Session, {
        timestamp: readingTime,
        temperature: temp,
        groundTruthTemp: temp,
      }, 2.0);
      setS4Session(updated);
      setS4State('BUFFERING_LOCALLY');
      setS4Timeline(prev => [
        ...prev,
        {
          stage: temp >= 5.0 ? 'Temperature Excursion' : 'Local Buffering',
          timestamp: readingTime,
          temperature: temp,
          networkState: 'BUFFERING_LOCALLY',
          eventDescription: `Sensor logging to on-board flash: ${temp}°C (${temp >= 2.0 ? 'EXCURSION' : 'Safe'}).`,
        }
      ]);
      setS4Step(prev => prev + 1);
    } else if (s4Step === 5) {
      // Step 6: Network Restored
      const restoredTime = new Date(baseTimeMs + 45 * 60000).toISOString();
      const updated = simulateNetworkRestored(s4Session, restoredTime);
      setS4Session(updated);
      setS4State('NETWORK_RESTORED');
      setS4Timeline(prev => [
        ...prev,
        {
          stage: 'Network Restored',
          timestamp: restoredTime,
          temperature: 5.6,
          networkState: 'NETWORK_RESTORED',
          eventDescription: 'Antenna handoff acquired. Re-established wireless link.',
        }
      ]);
      setS4Step(6);
    } else if (s4Step === 6) {
      // Step 7: Sync Complete
      const syncTime = new Date(baseTimeMs + 48 * 60000).toISOString();
      const { session: syncedSession } = synchronizeBuffer(s4Session, syncTime);
      setS4Session(syncedSession);
      setS4State('SYNC_COMPLETE');
      setS4Timeline(prev => [
        ...prev,
        {
          stage: 'Recovered Data',
          timestamp: syncTime,
          temperature: 1.5,
          networkState: 'SYNC_COMPLETE',
          eventDescription: '100% of offline readings synced. Peak 6.2°C excursion preserved without smoothing.',
        }
      ]);
      setS4Step(7);
    }
  };

  const getStatusBadge = (state: StoreAndForwardState) => {
    switch (state) {
      case 'CONNECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            CONNECTED (NORMAL)
          </span>
        );
      case 'NETWORK_OFFLINE':
      case 'BUFFERING_LOCALLY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            NETWORK OFFLINE • BUFFERING LOCALLY
          </span>
        );
      case 'NETWORK_RESTORED':
      case 'SYNCING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            NETWORK RESTORED • SYNCING
          </span>
        );
      case 'SYNC_COMPLETE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            SYNC COMPLETE • EXCURSION PRESERVED
          </span>
        );
    }
  };

  // Scenario 3 curve comparison
  const scenario3ChartData = [
    { time: '12:00', sensorA: 3.1, sensorB: 7.0, naiveAverage: 5.05, lowerBound: 1.0, upperBound: 9.2 },
    { time: '12:15', sensorA: 3.2, sensorB: 7.1, naiveAverage: 5.15, lowerBound: 1.0, upperBound: 9.5 },
    { time: '12:30', sensorA: 3.3, sensorB: 7.3, naiveAverage: 5.30, lowerBound: 1.1, upperBound: 9.8 },
    { time: '12:45', sensorA: 3.2, sensorB: 7.0, naiveAverage: 5.10, lowerBound: 1.0, upperBound: 9.4 },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass-panel p-5 bg-gradient-to-r from-purple-950/40 via-slate-900 to-cyan-950/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
              STORE & FORWARD LAB
            </span>
            <span className="text-xs font-mono text-cyan-400 font-semibold">
              Project Completion: 57%
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mt-1">
            <FlaskConical className="w-5 h-5 text-purple-400" />
            Failure Case Lab & Store-and-Forward Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Simulate and stress-test real-world edge telemetry failures: on-device flash buffering during network outages, 
            preservation of offline temperature spikes without smoothing, systematic calibration drift correction, and conflicting sensor handling.
          </p>
        </div>
      </div>

      {/* Scenario Selector Navigation Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveScenario('SCENARIO_4_OUTAGE_EXCURSION')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
            activeScenario === 'SCENARIO_4_OUTAGE_EXCURSION'
              ? 'bg-cyan-950 text-cyan-300 border-cyan-700 shadow-md shadow-cyan-950/50'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
          }`}
        >
          <Database className="w-4 h-4 text-cyan-400" />
          <span>Scenario 4: Store-and-Forward Outage Excursion</span>
        </button>

        <button
          onClick={() => setActiveScenario('SCENARIO_1_TOTAL_DROPOUT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
            activeScenario === 'SCENARIO_1_TOTAL_DROPOUT'
              ? 'bg-rose-950 text-rose-300 border-rose-700 shadow-md shadow-rose-950/50'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
          }`}
        >
          <Radio className="w-4 h-4 text-rose-400" />
          <span>Scenario 1: Total Sensor Dropout</span>
        </button>

        <button
          onClick={() => setActiveScenario('SCENARIO_2_MISCALIBRATED_SENSOR')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
            activeScenario === 'SCENARIO_2_MISCALIBRATED_SENSOR'
              ? 'bg-amber-950 text-amber-300 border-amber-700 shadow-md shadow-amber-950/50'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
          }`}
        >
          <Thermometer className="w-4 h-4 text-amber-400" />
          <span>Scenario 2: Miscalibrated Sensor</span>
        </button>

        <button
          onClick={() => setActiveScenario('SCENARIO_3_CONFLICTING_SENSORS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
            activeScenario === 'SCENARIO_3_CONFLICTING_SENSORS'
              ? 'bg-purple-950 text-purple-300 border-purple-700 shadow-md shadow-purple-950/50'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-purple-400" />
          <span>Scenario 3: Conflicting Sensors</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* SCENARIO 4: STORE-AND-FORWARD OUTAGE EXCURSION                  */}
      {/* ============================================================== */}
      {activeScenario === 'SCENARIO_4_OUTAGE_EXCURSION' && (
        <div className="space-y-6">
          {/* Controls & State Machine Header */}
          <div className="glass-panel p-5 bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  Store-and-Forward Telemetry Buffer & Outage Simulator
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verify that thermal excursions occurring while offline are preserved in local flash memory and never smoothed away.
                </p>
              </div>

              {/* Status Indicator */}
              <div className="shrink-0">
                {getStatusBadge(s4State)}
              </div>
            </div>

            {/* Run Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunScenario4Full}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-950/50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Complete Outage Scenario</span>
                </button>

                <button
                  onClick={handleStepScenario4}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 border border-slate-700"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Step Timeline ({s4Step}/7)</span>
                </button>

                <button
                  onClick={handleResetScenario4}
                  className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-medium rounded-lg text-xs transition-colors flex items-center gap-1.5 border border-slate-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Scenario</span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                <span>Node: <strong className="text-cyan-400 font-bold">ColdGuard Pro-IoT (sns-sim-101-1)</strong></span>
                <span>•</span>
                <span>Storage: <strong className="text-slate-200">512KB NOR Flash (FIFO)</strong></span>
              </div>
            </div>
          </div>

          {/* 4 Live Store-and-Forward KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard
              title="Buffered Readings"
              value={s4Session.bufferedReadings.length}
              subtitle="Packets in local flash"
              icon={Database}
              variant="cyan"
            />
            <KPICard
              title="Sync Count"
              value={s4Session.syncCount}
              subtitle="Packets pushed to cloud"
              icon={RefreshCw}
              variant="emerald"
            />
            <KPICard
              title="Sync Lag"
              value={s4Session.syncLagSeconds > 0 ? `${Math.round(s4Session.syncLagSeconds / 60)} min` : '0 min'}
              subtitle={`${s4Session.syncLagSeconds} sec transmission lag`}
              icon={Clock}
              variant="amber"
            />
            <KPICard
              title="Excursion Preserved"
              value={s4Session.peakExcursionTemp !== null ? `${s4Session.peakExcursionTemp.toFixed(1)}°C` : 'Normal'}
              subtitle={s4Session.excursionDetectedDuringOutage ? 'Preserved (NOT smoothed)' : 'Within limits'}
              icon={Thermometer}
              variant={s4Session.excursionDetectedDuringOutage ? 'rose' : 'cyan'}
            />
          </div>

          {/* Timeline Lifecycle Chart */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Outage Telemetry Trace & Excursion Recovery
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Notice the sharp temperature peak to <strong className="text-rose-400">6.2°C</strong> captured during the offline window, fully reconstructed upon sync.
                </p>
              </div>

              {s4Session.excursionDetectedDuringOutage && (
                <span className="px-2.5 py-1 rounded bg-rose-950 text-rose-300 font-mono text-[11px] font-bold border border-rose-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  EXCURSION PRESERVED (6.2°C)
                </span>
              )}
            </div>

            {/* Recharts Curve */}
            <div className="h-[260px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={s4Timeline.length > 0 ? s4Timeline : [
                    { stage: 'Connected', temperature: 1.0, timestamp: '10:00' },
                    { stage: 'Network Lost', temperature: 1.2, timestamp: '10:05' },
                    { stage: 'Local Buffering', temperature: 3.4, timestamp: '10:15' },
                    { stage: 'Temperature Excursion', temperature: 6.2, timestamp: '10:25' },
                    { stage: 'Local Buffering', temperature: 5.9, timestamp: '10:30' },
                    { stage: 'Network Restored', temperature: 4.8, timestamp: '10:45' },
                    { stage: 'Recovered Data', temperature: 1.4, timestamp: '10:50' },
                  ]}
                  margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis
                    dataKey="stage"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    domain={[0, 8]}
                    tickFormatter={(v) => `${v}°C`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1">
                            <div className="font-bold text-slate-200">{d.stage}</div>
                            <div className="font-mono text-cyan-400">Temp: {d.temperature}°C</div>
                            <p className="text-[10px] text-slate-400 italic max-w-xs">{d.eventDescription}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={2.0}
                    stroke="#f43f5e"
                    strokeDasharray="4 4"
                    label={{ value: 'Excursion Limit: 2.0°C', position: 'insideTopRight', fill: '#f43f5e', fontSize: 10 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    name="Sensor Recorded Temperature (°C)"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    dot={{ fill: '#06b6d4', r: 4 }}
                    activeDot={{ r: 7, stroke: '#67e8f9', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Stage Step Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
              {[
                { name: '1. Connected', state: 'CONNECTED' },
                { name: '2. Network Lost', state: 'NETWORK_OFFLINE' },
                { name: '3. Local Buffering', state: 'BUFFERING_LOCALLY' },
                { name: '4. Temp Excursion', state: 'BUFFERING_LOCALLY', isBreach: true },
                { name: '5. Net Restored', state: 'NETWORK_RESTORED' },
                { name: '6. Sync', state: 'SYNCING' },
                { name: '7. Recovered Data', state: 'SYNC_COMPLETE' },
              ].map((st, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    s4Step > i
                      ? st.isBreach
                        ? 'bg-rose-950/80 text-rose-300 border-rose-800 font-bold'
                        : 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
                      : s4Step === i
                      ? 'bg-purple-950 text-purple-200 border-purple-700 animate-pulse'
                      : 'bg-slate-950 text-slate-500 border-slate-900'
                  }`}
                >
                  <span className="block text-[10px] uppercase font-sans text-slate-400">Step {i + 1}</span>
                  <span className="font-bold">{st.name.split('. ')[1]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SCENARIO 1: TOTAL SENSOR DROPOUT                                */}
      {/* ============================================================== */}
      {activeScenario === 'SCENARIO_1_TOTAL_DROPOUT' && (
        <div className="space-y-6">
          <div className="glass-panel p-5 bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-rose-400" />
                  Scenario 1: Primary Sensor Completely Unavailable for Entire Leg
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Simulates a 240-minute customs inspection blackout where the primary probe is severed or out of battery.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setS1Ran(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-950/50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Scenario</span>
                </button>
                <button
                  onClick={() => setS1Ran(false)}
                  className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 rounded-lg text-xs border border-slate-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {s1Ran && (
              <div className="bg-rose-950/40 border border-rose-800/80 p-3 rounded-xl flex items-center justify-between text-xs">
                <span className="text-rose-300 font-semibold flex items-center gap-2">
                  <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
                  Scenario 1 Active: Primary probe dropped for 240 mins. Contextual kinetics applied, tail marked UNKNOWN.
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-900 text-rose-200 font-mono text-[10px] font-bold">
                  Confidence: 35%
                </span>
              </div>
            )}

            {/* Visualizer */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">1. Direct Telemetry</span>
                <span className="text-2xl font-bold font-mono text-rose-400">0 Readings</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Avoids pretending direct readings exist. Does not invent fabricated sensor pings during the dead period.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">2. Contextual Inference</span>
                <span className="text-2xl font-bold font-mono text-amber-400">±2.5°C Bounds</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Uses customs reefer setpoint (0.0°C) and journey leg kinetics. Confidence reduced to 35%.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">3. Hard Constraint on Uncertainty</span>
                <span className="text-2xl font-bold font-mono text-purple-400">Explicit UNKNOWN</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Unrecoverable tail sections explicitly marked UNKNOWN with estimatedTemperature = null.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SCENARIO 2: MISCALIBRATED SENSOR                                */}
      {/* ============================================================== */}
      {activeScenario === 'SCENARIO_2_MISCALIBRATED_SENSOR' && (
        <div className="space-y-6">
          <div className="glass-panel p-5 bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-amber-400" />
                  Scenario 2: Systematic Sensor Offset (Ground Truth 3°C vs Sensor 5°C)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detects systematic calibration drift and applies offset correction rather than panicking on false alarms.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setS2ShowGroundTruth(!s2ShowGroundTruth)}
                  className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-cyan-800 text-cyan-300 rounded-lg text-xs font-mono font-bold transition-colors"
                >
                  {s2ShowGroundTruth ? 'Hide Ground Truth' : 'Reveal Ground Truth'}
                </button>
                <button
                  onClick={() => setS2Ran(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-950/50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Scenario</span>
                </button>
                <button
                  onClick={() => setS2Ran(false)}
                  className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 rounded-lg text-xs border border-slate-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {s2Ran && (
              <div className="bg-amber-950/40 border border-amber-800/80 p-3 rounded-xl flex items-center justify-between text-xs">
                <span className="text-amber-300 font-semibold flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-amber-400 animate-pulse" />
                  Scenario 2 Active: Systematic +2.0°C drift isolated via steady-state regression. Calibrated estimate: 3.0°C.
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-900 text-amber-200 font-mono text-[10px] font-bold">
                  Confidence: 68%
                </span>
              </div>
            )}

            {/* Comparison Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 font-mono text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-sans font-semibold block">Observed Reading</span>
                <span className="text-2xl font-bold text-rose-400 mt-1 block">5.0 °C</span>
                <span className="text-[10px] text-slate-500 font-sans block mt-1">Raw uncalibrated probe</span>
              </div>

              {s2ShowGroundTruth ? (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-cyan-400 uppercase font-sans font-semibold block">Ground Truth (Debug View)</span>
                  <span className="text-2xl font-bold text-cyan-400 mt-1 block">3.0 °C</span>
                  <span className="text-[10px] text-slate-500 font-sans block mt-1">Internal true temperature</span>
                </div>
              ) : (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-center items-center text-slate-600">
                  <span className="text-[10px] uppercase font-sans font-semibold block">Ground Truth Hidden</span>
                  <span className="text-xs mt-1">(Click Reveal to Debug)</span>
                </div>
              )}

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] text-emerald-400 uppercase font-sans font-semibold block">Calibrated Estimate</span>
                <span className="text-2xl font-bold text-emerald-400 mt-1 block">3.0 °C</span>
                <span className="text-[10px] text-slate-500 font-sans block mt-1">Systematic -2.0°C adjusted</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] text-amber-400 uppercase font-sans font-semibold block">Confidence Impact</span>
                <span className="text-2xl font-bold text-amber-400 mt-1 block">68%</span>
                <span className="text-[10px] text-slate-500 font-sans block mt-1">Penalized (-25% bias)</span>
              </div>
            </div>

            {/* Potential Impact Callout */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-amber-900/30 text-xs space-y-1.5">
              <h5 className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-400" />
                Operational Impact Analysis:
              </h5>
              <p className="text-slate-300 leading-relaxed">
                Without calibration bias detection, the raw <strong>5.0°C</strong> reading would trigger a severe false alarm, quarantine 2,400 kg of fresh yellowfin tuna, 
                and lead to an unjustified carrier penalty. The calibrated estimate of <strong>3.0°C</strong> verifies product safety while dispatching a probe recalibration order.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SCENARIO 3: CONFLICTING SENSORS                                 */}
      {/* ============================================================== */}
      {activeScenario === 'SCENARIO_3_CONFLICTING_SENSORS' && (
        <div className="space-y-6">
          <div className="glass-panel p-5 bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-purple-400" />
                  Scenario 3: Conflicting Sensors (Sensor A: 3.2°C vs Sensor B: 7.1°C)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  When sensors disagree by Δ = 3.9°C, the system suppresses blind averaging and widens uncertainty bounds.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setS3Ran(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-purple-950/50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Scenario</span>
                </button>
                <button
                  onClick={() => setS3Ran(false)}
                  className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 rounded-lg text-xs border border-slate-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {s3Ran && (
              <div className="bg-purple-950/40 border border-purple-800/80 p-3 rounded-xl flex items-center justify-between text-xs">
                <span className="text-purple-300 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-purple-400 animate-pulse" />
                  Scenario 3 Active: Conflict Δ = 3.9°C detected. Blind averaging suppressed, bounds widened to ±3.2°C.
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-900 text-purple-200 font-mono text-[10px] font-bold">
                  Confidence: 45%
                </span>
              </div>
            )}

            {/* Comparison Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 font-mono text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] text-cyan-400 uppercase font-sans font-semibold block">Sensor A (Evaporator)</span>
                <span className="text-2xl font-bold text-cyan-400 mt-1 block">3.2 °C</span>
                <span className="text-[10px] text-slate-500 font-sans block mt-1">Normal chilled zone</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] text-rose-400 uppercase font-sans font-semibold block">Sensor B (Door Seal)</span>
                <span className="text-2xl font-bold text-rose-400 mt-1 block">7.1 °C</span>
                <span className="text-[10px] text-slate-500 font-sans block mt-1">Thermal breach zone</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] text-amber-400 uppercase font-sans font-semibold block">Conflict Magnitude (Δ)</span>
                <span className="text-2xl font-bold text-amber-400 mt-1 block">3.9 °C</span>
                <span className="text-[10px] text-slate-500 font-sans block mt-1">&gt; 2.5°C Discordance</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] text-purple-400 uppercase font-sans font-semibold block">Naive Average</span>
                <span className="text-2xl font-bold text-slate-400 line-through mt-1 block">5.15 °C</span>
                <span className="text-[10px] text-rose-400 font-sans font-bold block mt-1">BLIND AVERAGE REJECTED</span>
              </div>
            </div>

            {/* Recharts Discordance Curve */}
            <div className="h-[220px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scenario3ChartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis stroke="#64748b" domain={[0, 11]} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `${v}°C`} />
                  <Tooltip />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }} />
                  <Line type="monotone" dataKey="sensorA" name="Sensor A (Chiller: 3.2°C)" stroke="#06b6d4" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="sensorB" name="Sensor B (Door: 7.1°C)" stroke="#f43f5e" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="naiveAverage" name="Naive Average (5.15°C - SUPPRESSED)" stroke="#64748b" strokeDasharray="4 4" strokeWidth={1.5} />
                  <Line type="monotone" dataKey="upperBound" name="95% Upper Bound (9.5°C)" stroke="#c084fc" strokeDasharray="2 2" strokeWidth={1} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FORMAL FAILURE CASE REPORT                                     */}
      {/* ============================================================== */}
      <div className="glass-panel p-6 bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-slate-100">
              Failure Case Report: {currentReport.scenarioTitle}
            </h3>
          </div>
          <ConfidenceBadge score={currentReport.confidenceScore} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Expected vs Actual */}
          <div className="space-y-3">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="font-semibold text-cyan-400 block mb-1">Expected Behavior (Engineering Spec):</span>
              <p className="text-slate-300 leading-relaxed">{currentReport.expectedBehavior}</p>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="font-semibold text-purple-400 block mb-1">Actual Observed Behavior:</span>
              <p className="text-slate-300 leading-relaxed">{currentReport.actualBehavior}</p>
            </div>
          </div>

          {/* Data Availability & Risk */}
          <div className="space-y-3">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="font-semibold text-amber-400 block mb-1">Data Availability & Telemetry Coverage:</span>
              <p className="text-slate-300 leading-relaxed">{currentReport.dataAvailability}</p>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="font-semibold text-rose-400 block mb-1">Risk Interpretation & QA Action:</span>
              <p className="text-slate-300 leading-relaxed">{currentReport.riskInterpretation}</p>
            </div>
          </div>
        </div>

        {/* Quantitative Metrics Breakdown */}
        <div className="pt-2 border-t border-slate-800">
          <h5 className="font-semibold text-xs text-slate-300 mb-2">Detailed Scenario Metrics:</h5>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-mono text-xs">
            {Object.entries(currentReport.metrics).map(([key, val], idx) => (
              <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 font-sans block">{key}</span>
                <span className="font-bold text-slate-200 mt-0.5 block">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
