import React from 'react';
import { SensorReading, Gap } from '../types';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';
import { Warehouse, Anchor, Truck, Plane, ShieldCheck, MapPin } from 'lucide-react';

interface TelemetryTimelineProps {
  readings: SensorReading[];
  gaps: Gap[];
  targetTempMin?: number;
  targetTempMax?: number;
}

const JOURNEY_STAGES = [
  { name: 'Warehouse', icon: Warehouse, color: 'border-cyan-800 text-cyan-400' },
  { name: 'Port', icon: Anchor, color: 'border-blue-800 text-blue-400' },
  { name: 'Truck', icon: Truck, color: 'border-amber-800 text-amber-400' },
  { name: 'Vessel / Aircraft', icon: Plane, color: 'border-purple-800 text-purple-400' },
  { name: 'Customs', icon: ShieldCheck, color: 'border-rose-800 text-rose-400' },
  { name: 'Destination', icon: MapPin, color: 'border-emerald-800 text-emerald-400' },
];

export const TelemetryTimeline: React.FC<TelemetryTimelineProps> = ({
  readings,
  gaps: _gaps,
  targetTempMin = -1.5,
  targetTempMax = 1.5,
}) => {
  // Format telemetry chart points with ground truth vs observed vs missing gaps
  const chartData = readings.map((r) => {
    const isDropped = r.status === 'Dropped';
    const isBuffered = r.status === 'Buffered';

    return {
      time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      observedTemp: isDropped ? null : r.observed_temperature,
      groundTruthTemp: r.ground_truth_temperature,
      isDropped,
      isBuffered,
      legName: r.leg_name,
    };
  });

  return (
    <div className="space-y-4">
      {/* Chart Top Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            <span className="w-3 h-0.5 bg-cyan-400"></span>
            <span>Observed Telemetry (Solid Line)</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            <span className="w-3 h-0.5 bg-rose-500 border-b border-dashed border-rose-400"></span>
            <span className="text-rose-400 font-semibold">Missing Gap Period</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium text-slate-400">
            <span className="w-2.5 h-2.5 rounded bg-slate-800 border border-slate-700"></span>
            <span>Unknown Exposure Region</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium text-purple-400">
            <span className="w-3 h-0.5 bg-purple-500 border-b border-purple-400"></span>
            <span className="text-[11px] font-mono">(Reconstruction Reserved)</span>
          </div>
        </div>

        <div className="font-mono text-slate-400 text-[11px]">
          Target Window: <strong className="text-cyan-300">{targetTempMin}°C to {targetTempMax}°C</strong>
        </div>
      </div>

      {/* Main Recharts Area Chart */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="observedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="°C" domain={[-3, 6]} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
              formatter={(val: any) => [val === null ? 'Missing / Gap' : `${val} °C`, 'Temperature']}
            />
            <ReferenceLine y={targetTempMax} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: `Max (${targetTempMax}°C)`, fill: '#f59e0b', fontSize: 10 }} />
            <ReferenceLine y={targetTempMin} stroke="#06b6d4" strokeDasharray="3 3" label={{ value: `Min (${targetTempMin}°C)`, fill: '#06b6d4', fontSize: 10 }} />

            <Area
              type="monotone"
              dataKey="observedTemp"
              stroke="#06b6d4"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#observedGrad)"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Journey Stages Bar Below Timeline */}
      <div className="pt-2 border-t border-slate-800">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
          Shipment Journey Transfer Stages
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {JOURNEY_STAGES.map((stg, idx) => {
            const Icon = stg.icon;
            return (
              <div 
                key={idx}
                className={`p-2 rounded-lg bg-slate-950/80 border ${stg.color} flex items-center gap-2`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-medium text-slate-200 text-[11px] truncate">{stg.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
