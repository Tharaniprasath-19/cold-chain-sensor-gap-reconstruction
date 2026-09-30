import React, { useState } from 'react';
import { ThresholdTradeoffPoint } from '../types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  AreaChart,
  Area
} from 'recharts';
import { Activity, Info } from 'lucide-react';

interface TradeoffChartProps {
  data: ThresholdTradeoffPoint[];
  currentThreshold: number;
  onSelectThreshold?: (threshold: number) => void;
}

export const TradeoffChart: React.FC<TradeoffChartProps> = ({
  data,
  currentThreshold,
  onSelectThreshold,
}) => {
  const [activeTab, setActiveTab] = useState<'rates' | 'counts' | 'dual'>('rates');

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item: ThresholdTradeoffPoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-xl backdrop-blur-md text-xs space-y-1.5 min-w-[200px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-slate-200">Threshold: {label}°C</span>
            {label === currentThreshold && (
              <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 text-[10px] font-mono border border-cyan-800">
                ACTIVE
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 font-mono text-[11px]">
            <div className="text-rose-400">FPR: {item.falsePositiveRate}%</div>
            <div className="text-amber-400">FNR: {item.falseNegativeRate}%</div>
            <div className="text-slate-400">FP Count: {item.falsePositives}</div>
            <div className="text-slate-400">FN Count: {item.falseNegatives}</div>
            <div className="text-rose-300">Confirmed: {item.confirmedExposures}</div>
            <div className="text-purple-300">Possible: {item.possibleExposures}</div>
            <div className="text-slate-300 col-span-2 pt-1 border-t border-slate-800/80 flex justify-between">
              <span>Total Alert Breaches:</span>
              <span className="font-bold text-cyan-300">{item.totalAlerts}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 italic pt-1">Click node to set threshold</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel p-5 space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-slate-100">
              Ground Truth Threshold Tradeoff Curves
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Dynamic trade-off between False Alarm Rate (FPR) and Missed Exposure Rate (FNR) across temperature limits.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs shrink-0">
          <button
            onClick={() => setActiveTab('rates')}
            className={`px-3 py-1 rounded font-medium transition-all ${
              activeTab === 'rates'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            FPR vs FNR Rates (%)
          </button>
          <button
            onClick={() => setActiveTab('counts')}
            className={`px-3 py-1 rounded font-medium transition-all ${
              activeTab === 'counts'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Exposures Breakdown
          </button>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="h-[280px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === 'rates' ? (
            <LineChart
              data={data}
              margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
              onClick={(e: any) => {
                if (e?.activePayload?.[0]?.payload?.threshold !== undefined) {
                  onSelectThreshold?.(e.activePayload[0].payload.threshold);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis
                dataKey="threshold"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(v) => `${v}°C`}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              />
              <ReferenceLine
                x={currentThreshold}
                stroke="#06b6d4"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Active: ${currentThreshold}°C`,
                  position: 'insideTopLeft',
                  fill: '#06b6d4',
                  fontSize: 10,
                  fontWeight: 'bold',
                }}
              />
              <Line
                type="monotone"
                dataKey="falsePositiveRate"
                name="False Positive Rate (FPR %)"
                stroke="#f43f5e"
                strokeWidth={2.5}
                dot={{ fill: '#f43f5e', r: 3 }}
                activeDot={{ r: 6, stroke: '#fda4af', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="falseNegativeRate"
                name="False Negative Rate (FNR %)"
                stroke="#fbbf24"
                strokeWidth={2.5}
                dot={{ fill: '#fbbf24', r: 3 }}
                activeDot={{ r: 6, stroke: '#fde68a', strokeWidth: 2 }}
              />
            </LineChart>
          ) : (
            <AreaChart
              data={data}
              margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
              onClick={(e: any) => {
                if (e?.activePayload?.[0]?.payload?.threshold !== undefined) {
                  onSelectThreshold?.(e.activePayload[0].payload.threshold);
                }
              }}
            >
              <defs>
                <linearGradient id="confirmedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="possibleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c084fc" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#c084fc" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="lowConfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis
                dataKey="threshold"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(v) => `${v}°C`}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              />
              <ReferenceLine
                x={currentThreshold}
                stroke="#06b6d4"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Active: ${currentThreshold}°C`,
                  position: 'insideTopLeft',
                  fill: '#06b6d4',
                  fontSize: 10,
                  fontWeight: 'bold',
                }}
              />
              <Area
                type="monotone"
                dataKey="confirmedExposures"
                name="Confirmed Exposures"
                stroke="#f43f5e"
                fill="url(#confirmedGrad)"
                strokeWidth={2}
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="possibleExposures"
                name="Possible Exposures"
                stroke="#c084fc"
                fill="url(#possibleGrad)"
                strokeWidth={2}
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="lowConfidenceCount"
                name="Low Confidence Anomalies"
                stroke="#fbbf24"
                fill="url(#lowConfGrad)"
                strokeWidth={1.5}
                stackId="1"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Tradeoff Interpretation Guide */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            <strong className="text-slate-200">Optimal Operating Point:</strong> Select a threshold where the gap between False Alarms (FPR) and Missed Spoilage (FNR) is minimized.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 font-mono text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>False Positives (Over-alarm)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>False Negatives (Missed)</span>
          </span>
        </div>
      </div>
    </div>
  );
};
