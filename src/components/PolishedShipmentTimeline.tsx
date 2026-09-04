import React, { useState } from 'react';
import { ReconstructionPointResult, TimelineEventMarker } from '../types';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceLine,
  ReferenceDot
} from 'recharts';
import { 
  Warehouse, 
  Anchor, 
  Truck, 
  Plane, 
  ShieldCheck, 
  MapPin, 
  Eye, 
  Sparkles, 
  HelpCircle, 
  Bell, 
  SlidersHorizontal,
  ZoomIn,
  RotateCcw
} from 'lucide-react';

interface PolishedShipmentTimelineProps {
  points: ReconstructionPointResult[];
  events?: TimelineEventMarker[];
  targetTempMin?: number;
  targetTempMax?: number;
  onSelectPoint?: (point: ReconstructionPointResult) => void;
}

const JOURNEY_STAGES = [
  { name: 'Warehouse', icon: Warehouse, color: 'border-cyan-800 text-cyan-400' },
  { name: 'Port Gate', icon: Anchor, color: 'border-blue-800 text-blue-400' },
  { name: 'Truck', icon: Truck, color: 'border-amber-800 text-amber-400' },
  { name: 'Vessel / Aircraft', icon: Plane, color: 'border-purple-800 text-purple-400' },
  { name: 'Customs', icon: ShieldCheck, color: 'border-rose-800 text-rose-400' },
  { name: 'Destination Warehouse', icon: MapPin, color: 'border-emerald-800 text-emerald-400' },
];

export const PolishedShipmentTimeline: React.FC<PolishedShipmentTimelineProps> = ({
  points,
  events = [],
  targetTempMin = -1.5,
  targetTempMax = 1.5,
  onSelectPoint,
}) => {
  // Visibility Filter Toggles
  const [showObserved, setShowObserved] = useState<boolean>(true);
  const [showReconstructed, setShowReconstructed] = useState<boolean>(true);
  const [showUnknown, setShowUnknown] = useState<boolean>(true);
  const [showAlerts, setShowAlerts] = useState<boolean>(true);
  const [showEvents, setShowEvents] = useState<boolean>(true);

  // Zoom Controls (Slice Range)
  const [zoomRange, setZoomRange] = useState<[number, number]>([0, points.length || 100]);

  const startIndex = Math.max(0, zoomRange[0]);
  const endIndex = Math.min(points.length, zoomRange[1]);
  const visiblePoints = points.slice(startIndex, endIndex);

  // Prepare chart dataset
  const chartData = visiblePoints.map((p) => {
    const timeStr = new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isObserved = p.status === 'OBSERVED';
    const isReconstructed = p.status === 'RECONSTRUCTED';
    const isUnknown = p.status === 'UNKNOWN';

    return {
      time: timeStr,
      timestamp: p.timestamp,
      observedTemp: showObserved && isObserved ? p.estimatedTemperature : null,
      reconstructedTemp: showReconstructed && isReconstructed ? p.estimatedTemperature : null,
      boundsBand: showReconstructed && isReconstructed && p.upperBound !== null && p.lowerBound !== null
        ? [p.lowerBound, p.upperBound]
        : null,
      confidence: p.confidence,
      status: showUnknown && isUnknown ? 'UNKNOWN' : p.status,
      method: p.method,
      pointRef: p,
    };
  });

  const handleZoomIn = () => {
    const currentLen = endIndex - startIndex;
    if (currentLen <= 10) return;
    const pad = Math.floor(currentLen * 0.25);
    setZoomRange([startIndex + pad, endIndex - pad]);
  };

  const handleZoomOut = () => {
    setZoomRange([0, points.length]);
  };

  return (
    <div className="space-y-4">
      {/* Visibility Filters & Zoom Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
        {/* Toggle Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowObserved(!showObserved)}
            className={`px-2.5 py-1 rounded-md font-medium border transition-all flex items-center gap-1.5 ${
              showObserved ? 'bg-cyan-950 text-cyan-300 border-cyan-800' : 'bg-slate-900 text-slate-500 border-slate-800 opacity-60'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Observed</span>
          </button>

          <button
            onClick={() => setShowReconstructed(!showReconstructed)}
            className={`px-2.5 py-1 rounded-md font-medium border transition-all flex items-center gap-1.5 ${
              showReconstructed ? 'bg-purple-950 text-purple-300 border-purple-800' : 'bg-slate-900 text-slate-500 border-slate-800 opacity-60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Reconstructed</span>
          </button>

          <button
            onClick={() => setShowUnknown(!showUnknown)}
            className={`px-2.5 py-1 rounded-md font-medium border transition-all flex items-center gap-1.5 ${
              showUnknown ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-slate-900 text-slate-500 border-slate-800 opacity-60'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Unknown Gaps</span>
          </button>

          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className={`px-2.5 py-1 rounded-md font-medium border transition-all flex items-center gap-1.5 ${
              showAlerts ? 'bg-rose-950 text-rose-300 border-rose-800' : 'bg-slate-900 text-slate-500 border-slate-800 opacity-60'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts</span>
          </button>

          <button
            onClick={() => setShowEvents(!showEvents)}
            className={`px-2.5 py-1 rounded-md font-medium border transition-all flex items-center gap-1.5 ${
              showEvents ? 'bg-blue-950 text-blue-300 border-blue-800' : 'bg-slate-900 text-slate-500 border-slate-800 opacity-60'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Handover Events</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-cyan-400"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="font-mono text-[10px] text-slate-400 px-1">
            {visiblePoints.length} points
          </span>
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-cyan-400"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Recharts Composed Timeline Chart */}
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 15, right: 15, left: -20, bottom: 0 }}
            onClick={(e) => {
              if (e && e.activePayload && e.activePayload[0]) {
                const pObj = e.activePayload[0].payload.pointRef;
                if (pObj && onSelectPoint) onSelectPoint(pObj);
              }
            }}
          >
            <defs>
              <linearGradient id="polishedBandGrad" x1="0" y1="0" x2="0" y2="1">
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
                if (name === 'boundsBand') return [`[${val[0]}°C, ${val[1]}°C]`, '95% Uncertainty Band'];
                return [`${val} °C`, name === 'observedTemp' ? 'Observed Temp' : 'Reconstructed Temp'];
              }}
            />

            <ReferenceLine y={targetTempMax} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: `Max (${targetTempMax}°C)`, fill: '#f59e0b', fontSize: 10 }} />
            <ReferenceLine y={targetTempMin} stroke="#06b6d4" strokeDasharray="3 3" label={{ value: `Min (${targetTempMin}°C)`, fill: '#06b6d4', fontSize: 10 }} />

            {/* Event Markers on Timeline */}
            {showEvents && events.map((evt) => {
              const matchedPoint = chartData.find(d => Math.abs(new Date(d.timestamp).getTime() - new Date(evt.timestamp).getTime()) < 10 * 60000);
              if (!matchedPoint) return null;
              return (
                <ReferenceDot
                  key={evt.id}
                  x={matchedPoint.time}
                  y={matchedPoint.observedTemp || 0}
                  r={5}
                  fill={evt.impactSeverity === 'Critical' ? '#ef4444' : evt.impactSeverity === 'Warning' ? '#f59e0b' : '#3b82f6'}
                  stroke="#0f172a"
                  strokeWidth={2}
                />
              );
            })}

            {/* Shaded Uncertainty Confidence Band */}
            <Area
              type="monotone"
              dataKey="boundsBand"
              stroke="none"
              fill="url(#polishedBandGrad)"
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

            {/* Reconstructed Dashed Line */}
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
      <div className="pt-3 border-t border-slate-800">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
          Multimodal Cold-Chain Journey Stage Markers
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {JOURNEY_STAGES.map((stg, idx) => {
            const Icon = stg.icon;
            return (
              <div 
                key={idx}
                className={`p-2 rounded-lg bg-slate-950/90 border ${stg.color} flex items-center gap-2`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-semibold text-slate-200 text-[11px] truncate">{stg.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
