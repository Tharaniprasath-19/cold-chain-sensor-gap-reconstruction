import React from 'react';
import { ReconstructionPointResult } from '../types';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';
import { Warehouse, Anchor, Truck, Plane, ShieldCheck, MapPin } from 'lucide-react';

interface ReconstructionChartProps {
  points: ReconstructionPointResult[];
  onSelectPoint?: (point: ReconstructionPointResult) => void;
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

export const ReconstructionChart: React.FC<ReconstructionChartProps> = ({
  points,
  onSelectPoint,
  targetTempMin = -1.5,
  targetTempMax = 1.5,
}) => {
  const chartData = points.map((p) => {
    const timeStr = new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isObserved = p.status === 'OBSERVED';
    const isReconstructed = p.status === 'RECONSTRUCTED';
    const isUnknown = p.status === 'UNKNOWN';

    return {
      time: timeStr,
      timestamp: p.timestamp,
      observedTemp: isObserved ? p.estimatedTemperature : null,
      reconstructedTemp: isReconstructed ? p.estimatedTemperature : null,
      lowerBound: isReconstructed ? p.lowerBound : null,
      upperBound: isReconstructed ? p.upperBound : null,
      // For Recharts area band between lowerBound and upperBound:
      boundsBand: isReconstructed && p.upperBound !== null && p.lowerBound !== null
        ? [p.lowerBound, p.upperBound]
        : null,
      confidence: p.confidence,
      confidenceLevel: p.confidenceLevel,
      status: p.status,
      method: p.method,
      isUnknown,
      pointRef: p,
    };
  });

  return (
    <div className="space-y-4">
      {/* Chart Legend & Legend Notice */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 font-medium text-slate-200">
            <span className="w-3 h-0.5 bg-cyan-400"></span>
            <span>Observed (Solid Cyan Line)</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium text-purple-300">
            <span className="w-3 h-0.5 bg-purple-400 border-b border-dashed border-purple-300"></span>
            <span>Reconstructed (Purple Dashed Line)</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium text-purple-400">
            <span className="w-3 h-3 rounded bg-purple-950/80 border border-purple-700/60"></span>
            <span>Uncertainty Confidence Band</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium text-slate-400">
            <span className="w-3 h-3 rounded bg-slate-900 border border-slate-800"></span>
            <span>Explicit Unknown Period (No Fake Data!)</span>
          </div>
        </div>

        <span className="font-mono text-slate-400 text-[11px]">
          Target Thermal Envelope: <strong className="text-cyan-300">{targetTempMin}°C to {targetTempMax}°C</strong>
        </span>
      </div>

      {/* Main Recharts Composed Chart */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            onClick={(e) => {
              if (e && e.activePayload && e.activePayload[0]) {
                const pointObj = e.activePayload[0].payload.pointRef;
                if (pointObj && onSelectPoint) {
                  onSelectPoint(pointObj);
                }
              }
            }}
          >
            <defs>
              <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c084fc" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#c084fc" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="°C" domain={[-4, 7]} />

            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
              formatter={(val: any, name: string) => {
                if (val === null) return ['Blank / Unrecoverable', 'Temperature'];
                if (name === 'boundsBand') return [`[${val[0]}°C , ${val[1]}°C]`, '95% Uncertainty Band'];
                return [`${val} °C`, name === 'observedTemp' ? 'Observed Temp' : 'Reconstructed Temp'];
              }}
            />

            <ReferenceLine y={targetTempMax} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: `Max (${targetTempMax}°C)`, fill: '#f59e0b', fontSize: 10 }} />
            <ReferenceLine y={targetTempMin} stroke="#06b6d4" strokeDasharray="3 3" label={{ value: `Min (${targetTempMin}°C)`, fill: '#06b6d4', fontSize: 10 }} />

            {/* Shaded Uncertainty Band Area */}
            <Area
              type="monotone"
              dataKey="boundsBand"
              stroke="none"
              fill="url(#bandGrad)"
              connectNulls={false}
            />

            {/* Solid Observed Line */}
            <Line
              type="monotone"
              dataKey="observedTemp"
              stroke="#06b6d4"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#06b6d4' }}
              connectNulls={false}
            />

            {/* Purple Dashed Reconstructed Line */}
            <Line
              type="monotone"
              dataKey="reconstructedTemp"
              stroke="#c084fc"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              dot={{ r: 4, fill: '#c084fc' }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Journey Stages Bar Below Timeline */}
      <div className="pt-2 border-t border-slate-800">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
          Export Transport Journey Stages
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
