import React, { useState } from 'react';
import { Shipment, Sensor, Gap, HandoverEvent, SensorReading, ReconstructionPointResult } from '../types';
import { reconstructShipmentGaps } from '../services/reconstruction/reconstructionEngine';
import { StatusBadge } from '../components/StatusBadge';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { PolishedShipmentTimeline } from '../components/PolishedShipmentTimeline';
import { PageKey } from '../components/Sidebar';
import { 
  ShieldAlert, 
  Sparkles, 
  ArrowLeft,
  Info,
  AlertTriangle,
  FileCheck
} from 'lucide-react';

interface ShipmentDetailPageProps {
  shipmentId: string;
  shipments: Shipment[];
  sensors: Sensor[];
  gaps: Gap[];
  handovers: HandoverEvent[];
  readings?: SensorReading[];
  onNavigate: (page: PageKey) => void;
}

export const ShipmentDetailPage: React.FC<ShipmentDetailPageProps> = ({
  shipmentId,
  shipments,
  sensors,
  gaps,
  handovers: _handovers,
  readings = [],
  onNavigate,
}) => {
  const [selectedPoint, setSelectedPoint] = useState<ReconstructionPointResult | null>(null);

  const shipment = shipments.find((s) => s.id === shipmentId) || shipments[0];
  const shipmentGaps = gaps.filter((g) => g.shipmentId === shipment.id);
  const shipmentSensors = sensors.filter((s) => shipment.sensorIds.includes(s.id));
  const primarySensor = shipmentSensors[0] || sensors[0];

  // Run reconstruction solver for timeline
  const reconstructionRes = reconstructShipmentGaps(
    readings,
    gaps,
    shipment.id,
    primarySensor?.id || 'sns-sim-101-1',
    (shipment.targetTempMin + shipment.targetTempMax) / 2
  );

  const points = reconstructionRes.points;

  // Calculate 7 Summary Metrics
  const totalPoints = points.length || 1;
  const observedCount = points.filter(p => p.status === 'OBSERVED').length;
  const reconstructedCount = points.filter(p => p.status === 'RECONSTRUCTED').length;

  const observedPct = Math.round((observedCount / totalPoints) * 100);
  const reconstructedPct = Math.round((reconstructedCount / totalPoints) * 100);
  const unknownPct = 100 - observedPct - reconstructedPct;

  const validTemps = points.map(p => p.estimatedTemperature).filter((t): t is number => t !== null);
  const highestTemp = validTemps.length > 0 ? Math.max(...validTemps) : shipment.currentTemp;
  
  const confScores = points.map(p => p.confidence).filter(c => c > 0);
  const lowestConf = confScores.length > 0 ? Math.min(...confScores) * 100 : 85.0;

  const longestGapMins = shipmentGaps.length > 0 ? Math.max(...shipmentGaps.map(g => g.durationMinutes)) : 0;
  const potentialExposureMins = shipmentGaps
    .filter(g => g.thermalRisk === 'Potential exposure' || g.thermalRisk === 'Confirmed exposure')
    .reduce((acc, g) => acc + g.durationMinutes, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('shipments')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Shipments</span>
        </button>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => onNavigate('gap-analysis')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs text-amber-400 font-medium flex items-center gap-1.5"
          >
            <span>Gap Details ({shipmentGaps.length})</span>
          </button>
          <button 
            onClick={() => onNavigate('reconstruction')}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-950/40"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch Reconstruction Engine</span>
          </button>
        </div>
      </div>

      {/* Consignment Header Banner */}
      <div className="glass-panel p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xl font-bold text-cyan-400">{shipment.code}</span>
              <StatusBadge status={shipment.temperatureStatus} size="md" />
              <StatusBadge status={shipment.sensorStatus} size="md" />
            </div>
            <h1 className="text-xl font-bold text-slate-100 mt-1">{shipment.product}</h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Route: {shipment.origin.split(',')[0]} → <strong className="text-slate-200">{shipment.destination.split(',')[0]}</strong> | Status: <span className="text-cyan-300 font-semibold">{shipment.currentLeg}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Overall Confidence</span>
              <ConfidenceBadge score={shipment.confidence} showBar />
            </div>
            <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Risk Status</span>
              <span className={`font-mono text-xs font-bold px-2.5 py-1 rounded border ${
                shipment.riskLevel === 'Critical' ? 'bg-rose-950 text-rose-400 border-rose-800' :
                shipment.riskLevel === 'High' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                'bg-emerald-950 text-emerald-400 border-emerald-800'
              }`}>
                {shipment.riskLevel} Risk
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Target Window</span>
              <span className="font-mono text-xs text-cyan-300 font-bold">
                {shipment.targetTempMin}°C to {shipment.targetTempMax}°C
              </span>
            </div>
          </div>
        </div>

        {/* 7 Summary Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase block">Observed Time</span>
            <span className="font-mono text-base font-bold text-cyan-400">{observedPct}%</span>
            <span className="text-[10px] text-slate-500 block">Direct telemetry</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase block">Reconstructed</span>
            <span className="font-mono text-base font-bold text-purple-400">{reconstructedPct}%</span>
            <span className="text-[10px] text-slate-500 block">Estimated curves</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase block">Unknown Time</span>
            <span className="font-mono text-base font-bold text-amber-400">{unknownPct}%</span>
            <span className="text-[10px] text-slate-500 block">Unmonitored gaps</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase block">Highest Temp</span>
            <span className="font-mono text-base font-bold text-slate-100">{highestTemp > 0 ? `+${highestTemp}` : highestTemp} °C</span>
            <span className="text-[10px] text-slate-500 block">Peak reading</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase block">Lowest Confidence</span>
            <span className="font-mono text-base font-bold text-cyan-300">{lowestConf.toFixed(0)}%</span>
            <span className="text-[10px] text-slate-500 block">Min score</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase block">Longest Gap</span>
            <span className="font-mono text-base font-bold text-slate-200">{longestGapMins}m</span>
            <span className="text-[10px] text-slate-500 block">Max blackout</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase block">Exposure Duration</span>
            <span className="font-mono text-base font-bold text-rose-400">{potentialExposureMins}m</span>
            <span className="text-[10px] text-slate-500 block">Potential warning</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Polished Timeline Section */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-200">
              Interactive Consignment Confidence Timeline & Uncertainty Band
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuous 24-hour log combining direct telemetry, reconstructed segments, 95% uncertainty bands, and journey transfer markers.
            </p>
          </div>
        </div>

        <PolishedShipmentTimeline
          points={points}
          targetTempMin={shipment.targetTempMin}
          targetTempMax={shipment.targetTempMax}
          onSelectPoint={setSelectedPoint}
        />
      </div>

      {/* Confidence Summary & QA Notice Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-5 space-y-4">
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-cyan-400" />
            Consignment Confidence Summary
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-300">Overall Shipment Timeline Confidence:</span>
              <span className="font-mono text-base font-bold text-cyan-400">{shipment.confidence}%</span>
            </div>

            {/* Proportion Bar */}
            <div className="w-full h-3 rounded-full bg-slate-950 flex overflow-hidden border border-slate-800">
              <div className="h-full bg-cyan-500" style={{ width: `${observedPct}%` }} title={`Observed: ${observedPct}%`}></div>
              <div className="h-full bg-purple-500" style={{ width: `${reconstructedPct}%` }} title={`Reconstructed: ${reconstructedPct}%`}></div>
              <div className="h-full bg-amber-500" style={{ width: `${unknownPct}%` }} title={`Unknown: ${unknownPct}%`}></div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-cyan-400"></span> Observed: {observedPct}%</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-purple-400"></span> Reconstructed: {reconstructedPct}%</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-amber-400"></span> Unknown: {unknownPct}%</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5 text-xs">
            <p className="text-amber-300 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{unknownPct}% of this shipment timeline cannot be reliably reconstructed.</span>
            </p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Reconstructed mathematical values represent statistical estimations based on thermal kinetics and secondary sensor fusion. They are <strong>never</strong> presented as confirmed measurements.
            </p>
          </div>
        </div>

        {/* Selected Inspector Rationale Card */}
        {selectedPoint ? (
          <div className="glass-panel p-5 space-y-3 border-purple-900/60">
            <h3 className="font-bold text-sm text-purple-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Selected Point Telemetry Rationale
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Status & Method:</span>
                <span className="font-mono font-bold text-cyan-300">{selectedPoint.status} ({selectedPoint.method})</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Temp:</span>
                <span className="font-mono font-bold text-slate-100">
                  {selectedPoint.estimatedTemperature !== null ? `${selectedPoint.estimatedTemperature}°C` : 'UNKNOWN'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Confidence Score:</span>
                <span className="font-mono font-bold text-purple-400">{(selectedPoint.confidence * 100).toFixed(0)}% ({selectedPoint.confidenceLevel})</span>
              </div>

              <div className="p-2.5 rounded bg-slate-950 text-slate-300 font-mono text-[11px]">
                {selectedPoint.uncertaintyReason}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-5 flex flex-col items-center justify-center text-center text-xs text-slate-400 space-y-2">
            <Info className="w-6 h-6 text-cyan-400" />
            <p>Click any point on the timeline chart to inspect its individual temperature rationale and evidence list.</p>
          </div>
        )}
      </div>

      {/* "Uncertain Periods" Table */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Uncertain Periods & Professional QA Handling Actions
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {shipmentGaps.length} Blackout Periods Identified
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-xs uppercase bg-slate-900/90 text-slate-400 border-b border-slate-800">
              <tr>
                <th scope="col" className="px-3.5 py-3 font-semibold">Start Time</th>
                <th scope="col" className="px-3.5 py-3 font-semibold">End Time</th>
                <th scope="col" className="px-3.5 py-3 font-semibold">Duration</th>
                <th scope="col" className="px-3.5 py-3 font-semibold">Journey Stage</th>
                <th scope="col" className="px-3.5 py-3 font-semibold">Reason</th>
                <th scope="col" className="px-3.5 py-3 font-semibold">Confidence</th>
                <th scope="col" className="px-3.5 py-3 font-semibold">Recommended Handling</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {shipmentGaps.map((gap) => (
                <tr key={gap.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-3.5 py-3 text-slate-300">{new Date(gap.startTime).toLocaleTimeString()}</td>
                  <td className="px-3.5 py-3 text-slate-300">{new Date(gap.endTime).toLocaleTimeString()}</td>
                  <td className="px-3.5 py-3 font-bold text-amber-400">{gap.durationMinutes} mins</td>
                  <td className="px-3.5 py-3 font-sans font-medium text-slate-200">{gap.legName}</td>
                  <td className="px-3.5 py-3 font-sans text-slate-300 max-w-[180px] truncate">{gap.probableCause}</td>
                  <td className="px-3.5 py-3 font-sans">
                    <ConfidenceBadge score={gap.confidence} />
                  </td>
                  <td className="px-3.5 py-3 font-sans font-semibold whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded border ${
                      gap.thermalIntegrityRisk === 'Spoil Risk' 
                        ? 'bg-rose-950 text-rose-300 border-rose-800' 
                        : gap.thermalIntegrityRisk === 'Excursion Warning'
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    }`}>
                      {gap.thermalIntegrityRisk === 'Spoil Risk' 
                        ? 'Possible exposure — verify on arrival' 
                        : gap.thermalIntegrityRisk === 'Excursion Warning'
                        ? 'Perform core probe check at intake'
                        : 'Visual QA inspection recommended'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
