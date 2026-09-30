import React from 'react';
import { Shipment, Sensor, Gap, Alert, SensorReading, Worker, WorkloadTask } from '../types';
import { KPICard } from '../components/KPICard';
import { ShipmentTable } from '../components/ShipmentTable';
import { EventCard } from '../components/EventCard';
import { generateSensorReadings } from '../data/mockData';
import { PageKey } from '../components/Sidebar';
import { initialMockTasks } from '../services/workload/workloadEngine';
import { mockWorkers } from '../data/mockData';
import { 
  Ship, 
  Radio, 
  Activity, 
  Sparkles, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  HelpCircle,
  Users,
  Inbox,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';

interface DashboardPageProps {
  shipments: Shipment[];
  sensors: Sensor[];
  gaps: Gap[];
  alerts: Alert[];
  readings?: SensorReading[];
  workers?: Worker[];
  tasks?: WorkloadTask[];
  onSelectShipment: (id: string) => void;
  onNavigate: (page: PageKey) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  shipments,
  sensors,
  gaps,
  alerts,
  readings = [],
  workers = mockWorkers,
  tasks = initialMockTasks,
  onSelectShipment,
  onNavigate,
}) => {
  // 1. Total Shipments
  const totalShipments = shipments.length;

  // 2. Sensors Online & Total
  const sensorsOnlineCount = sensors.filter(s => s.status === 'Healthy' || s.status === 'Observed' || s.status === 'Warning').length;
  const totalSensors = sensors.length;

  // 3. Detected Gaps
  const totalGapsCount = gaps.length;

  // 4. Reconstructed Minutes
  const reconstructedGaps = gaps.filter(g => g.gapType !== 'DEAD_SENSOR' && g.thermalRisk !== 'Unknown');
  const reconstructedMinutes = reconstructedGaps.reduce((acc, g) => acc + g.durationMinutes, 0);

  // 5. Unknown Minutes
  const unknownGaps = gaps.filter(g => g.gapType === 'DEAD_SENSOR' || g.thermalRisk === 'Unknown');
  const unknownMinutes = unknownGaps.reduce((acc, g) => acc + g.durationMinutes, 0);

  // 6. Confirmed Exposures
  const confirmedExposuresCount = alerts.filter(a => a.status === 'CONFIRMED_EXPOSURE').length;

  // 7. Possible Exposures
  const possibleExposuresCount = alerts.filter(a => a.status === 'POSSIBLE_EXPOSURE').length;

  // 8. Average Confidence
  const avgConfidence = shipments.length > 0 
    ? (shipments.reduce((acc, s) => acc + s.confidence, 0) / shipments.length).toFixed(1)
    : '87.5';

  // 9. Worker Tasks
  const totalWorkerTasks = workers.reduce((acc: number, w: Worker) => acc + w.currentTasks, 0);

  // 10. Queued Tasks
  const totalQueuedTasks = tasks.filter(t => t.status === 'QUEUED' || t.status === 'UNASSIGNED').length;

  // Generate chart readings for top selected shipment
  const sampleReadings = readings.length > 0 
    ? readings.filter(r => r.shipmentId === shipments[0]?.id).slice(0, 40)
    : generateSensorReadings(shipments[0]?.id || 'shp-sim-101');

  const chartData = sampleReadings.map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    temperature: r.temperature,
    isReconstructed: r.isReconstructed,
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 bg-gradient-to-r from-slate-900 via-cyan-950/30 to-slate-900">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Cold-Chain Executive Dashboard
            <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
              Live Fleet Telemetry
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time thermal monitoring, sensor communication gap detection, and confidence modeling for active seafood exports.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => onNavigate('gap-analysis')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors flex items-center gap-2"
          >
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Analyze {totalGapsCount} Gaps</span>
          </button>

          <button 
            onClick={() => onNavigate('reconstruction')}
            className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-medium text-slate-950 font-semibold shadow-lg shadow-cyan-950/50 transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Run Reconstruction</span>
          </button>
        </div>
      </div>

      {/* 10 Dynamic KPI Cards Grid (5x2 Responsive Matrix) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Fleet Operations & Thermal Analytics (10 Dynamic KPIs)
          </h3>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2 py-0.5 rounded">
            Programmatically Calculated
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Total Shipments */}
          <KPICard
            title="Total Shipments"
            value={totalShipments}
            subtitle="Active Consignments"
            icon={Ship}
            variant="cyan"
            onClick={() => onNavigate('shipments')}
          />

          {/* 2. Sensors */}
          <KPICard
            title="Sensors Online"
            value={`${sensorsOnlineCount}/${totalSensors}`}
            subtitle="Active Fleet Probes"
            icon={Radio}
            variant="emerald"
            onClick={() => onNavigate('sensors')}
          />

          {/* 3. Detected Gaps */}
          <KPICard
            title="Detected Gaps"
            value={totalGapsCount}
            subtitle="Telemetry Dropouts"
            icon={Activity}
            variant="amber"
            onClick={() => onNavigate('gap-analysis')}
          />

          {/* 4. Reconstructed Minutes */}
          <KPICard
            title="Reconstructed"
            value={`${reconstructedMinutes}m`}
            subtitle="Estimated Profile Time"
            icon={Sparkles}
            variant="purple"
            onClick={() => onNavigate('reconstruction')}
          />

          {/* 5. Unknown Minutes */}
          <KPICard
            title="Unknown Minutes"
            value={`${unknownMinutes}m`}
            subtitle="Explicit Blackouts"
            icon={HelpCircle}
            variant="blue"
            onClick={() => onNavigate('gap-analysis')}
          />

          {/* 6. Confirmed Exposures */}
          <KPICard
            title="Confirmed Alerts"
            value={confirmedExposuresCount}
            subtitle="Immediate Action"
            icon={AlertTriangle}
            variant="rose"
            onClick={() => onNavigate('alerts')}
          />

          {/* 7. Possible Exposures */}
          <KPICard
            title="Possible Alerts"
            value={possibleExposuresCount}
            subtitle="Arrival Probe Check"
            icon={AlertCircle}
            variant="amber"
            onClick={() => onNavigate('alerts')}
          />

          {/* 8. Average Confidence */}
          <KPICard
            title="Avg Confidence"
            value={`${avgConfidence}%`}
            subtitle="Fleet Uncertainty Mean"
            icon={ShieldCheck}
            variant="blue"
          />

          {/* 9. Worker Tasks */}
          <KPICard
            title="Worker Tasks"
            value={totalWorkerTasks}
            subtitle="Assigned Across Field"
            icon={Users}
            variant="cyan"
            onClick={() => onNavigate('workload')}
          />

          {/* 10. Queued Tasks */}
          <KPICard
            title="Queued Tasks"
            value={totalQueuedTasks}
            subtitle="Safeguarded Buffer"
            icon={Inbox}
            variant="purple"
            onClick={() => onNavigate('workload')}
          />
        </div>
      </div>

      {/* Main Grid: Chart + Events Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Telemetry Overview Chart (2 Columns) */}
        <div className="lg:col-span-2 glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                Live Sensor Telemetry Stream & Gap Overlay
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Thermal trace for {shipments[0]?.code} ({shipments[0]?.product})
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Observed
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span> Reconstructed Gap
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="°C" domain={[-3, 4]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: number) => [`${val} °C`, 'Temperature']}
                />
                <ReferenceLine y={1.5} label={{ value: 'Max Threshold (+1.5°C)', fill: '#f59e0b', fontSize: 10 }} stroke="#f59e0b" strokeDasharray="3 3" />
                <ReferenceLine y={-1.5} label={{ value: 'Min Threshold (-1.5°C)', fill: '#06b6d4', fontSize: 10 }} stroke="#06b6d4" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="temperature" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#tempGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Events Panel (1 Column) */}
        <div className="glass-panel p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Recent Excursion Events & Alerts
            </h3>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              Live Feed
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
            {alerts.slice(0, 3).map((alt) => (
              <EventCard key={alt.id} alert={alt} onSelectShipment={onSelectShipment} />
            ))}
          </div>

          <button 
            onClick={() => onNavigate('alerts')}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>View All Alerts Log</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Shipment Overview Table */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
              Active Export Shipment Fleet Overview
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live logistics monitoring across all active air, ocean, and reefer transport legs.
            </p>
          </div>
          <button 
            onClick={() => onNavigate('shipments')}
            className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-medium"
          >
            <span>View All Shipments</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <ShipmentTable
          shipments={shipments}
          onSelectShipment={(id) => {
            onSelectShipment(id);
            onNavigate('shipment-detail');
          }}
        />
      </div>
    </div>
  );
};
