import React, { useState } from 'react';
import { Shipment, Sensor, SensorReading, Gap, ReconstructionPointResult } from '../types';
import { reconstructShipmentGaps } from '../services/reconstruction/reconstructionEngine';
import { ReconstructionChart } from '../components/ReconstructionChart';
import { KPICard } from '../components/KPICard';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { 
  Sparkles, 
  HelpCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Info,
  Layers
} from 'lucide-react';

interface ReconstructionPageProps {
  shipments: Shipment[];
  sensors: Sensor[];
  readings: SensorReading[];
  gaps: Gap[];
}

export const ReconstructionPage: React.FC<ReconstructionPageProps> = ({
  shipments,
  sensors,
  readings,
  gaps,
}) => {
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>(
    shipments[0]?.id || 'shp-sim-101'
  );
  const [selectedSensorId, setSelectedSensorId] = useState<string>(
    sensors.find((s) => s.currentShipmentId === selectedShipmentId)?.id || sensors[0]?.id || 'sns-sim-101-1'
  );
  const [selectedPoint, setSelectedPoint] = useState<ReconstructionPointResult | null>(null);

  const selectedShipment = shipments.find((s) => s.id === selectedShipmentId) || shipments[0];
  const shipmentSensors = sensors.filter((s) => s.currentShipmentId === selectedShipmentId);

  // Run reconstruction engine for active shipment and sensor
  const reconstructionResult = reconstructShipmentGaps(
    readings,
    gaps,
    selectedShipmentId,
    selectedSensorId,
    selectedShipment ? (selectedShipment.targetTempMin + selectedShipment.targetTempMax) / 2 : 0.0
  );

  const { points, reconstructedGapsCount, unrecoverableGapsCount, averageConfidence } = reconstructionResult;

  // Active point for inspector modal (default to first reconstructed or unrecoverable point if none selected)
  const activeInspectorPoint = selectedPoint || points.find((p) => p.status !== 'OBSERVED') || points[0];

  const getMethodBadgeStyle = (method: string) => {
    switch (method) {
      case 'INTERPOLATION':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'TREND_ESTIMATION':
        return 'bg-cyan-950 text-cyan-300 border-cyan-800';
      case 'CORRELATED_SENSOR':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'JOURNEY_CONTEXT':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'CONFLICT_WIDENED':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'UNRECOVERABLE':
      default:
        return 'bg-slate-900 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Cold-Chain Gap Reconstruction & Transparent Confidence Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Layered 6-level thermal estimation engine quantifying uncertainty with confidence bands and evidence factor breakdowns.
          </p>
        </div>

        {/* Shipment & Sensor Selectors */}
        <div className="flex flex-wrap items-center gap-3 text-xs shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Shipment:</span>
            <select
              value={selectedShipmentId}
              onChange={(e) => {
                const sId = e.target.value;
                setSelectedShipmentId(sId);
                const firstSns = sensors.find((s) => s.currentShipmentId === sId);
                if (firstSns) setSelectedSensorId(firstSns.id);
                setSelectedPoint(null);
              }}
              className="bg-transparent text-slate-200 focus:outline-none font-mono font-bold"
            >
              {shipments.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900">
                  {s.code} ({s.product.split(' ')[0]})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Sensor Node:</span>
            <select
              value={selectedSensorId}
              onChange={(e) => {
                setSelectedSensorId(e.target.value);
                setSelectedPoint(null);
              }}
              className="bg-transparent text-cyan-400 focus:outline-none font-mono font-bold"
            >
              {shipmentSensors.map((sns) => (
                <option key={sns.id} value={sns.id} className="bg-slate-900">
                  {sns.serialNumber} ({sns.type})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Hard Constraint Principle Banner */}
      <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/60 flex items-start gap-3">
        <Info className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-purple-300 uppercase tracking-wide">
            Core Design Principle: "Reconstructed values are NEVER presented as equivalent to observed values."
          </h4>
          <p className="text-slate-300 leading-relaxed">
            Every reconstructed segment visibly carries a confidence score, lower/upper bounds, evidence list, and uncertainty reason. Completely unrecoverable periods are explicitly marked as <strong className="text-slate-100">UNKNOWN / UNRECOVERABLE</strong> without fake temperature interpolation.
          </p>
        </div>
      </div>

      {/* 4 Reconstruction KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Reconstructed Segments"
          value={reconstructedGapsCount}
          subtitle="Restored Thermal Profiles"
          icon={Sparkles}
          variant="purple"
        />

        <KPICard
          title="Unrecoverable Gaps"
          value={unrecoverableGapsCount}
          subtitle="Explicit UNKNOWN Periods"
          icon={AlertTriangle}
          variant="amber"
        />

        <KPICard
          title="Average Confidence"
          value={`${(averageConfidence * 100).toFixed(1)}%`}
          subtitle="Engine Score Model"
          icon={ShieldCheck}
          variant="cyan"
        />

        <KPICard
          title="Primary Strategy"
          value={activeInspectorPoint?.method || 'INTERPOLATION'}
          subtitle="Layered 6-Level Solver"
          icon={Layers}
          variant="emerald"
        />
      </div>

      {/* Visual Chart + Inspector Modal Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Reconstruction Visual Chart */}
        <div className="lg:col-span-2 glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-200">
                Continuous Thermal Graph & Uncertainty Confidence Bands
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any reconstructed point on the chart to inspect its mathematical rationale.
              </p>
            </div>
            <span className="font-mono text-xs text-purple-400 font-bold bg-purple-950/80 px-2.5 py-1 rounded border border-purple-800">
              {selectedShipment.code}
            </span>
          </div>

          <ReconstructionChart
            points={points}
            onSelectPoint={setSelectedPoint}
            targetTempMin={selectedShipment.targetTempMin}
            targetTempMax={selectedShipment.targetTempMax}
          />
        </div>

        {/* Right 1 Column: "Why was this value reconstructed?" Inspector Modal */}
        {activeInspectorPoint && (
          <div className="glass-panel p-5 space-y-5 border-purple-900/60 shadow-xl shadow-purple-950/30">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm text-slate-100">Why was this value reconstructed?</h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getMethodBadgeStyle(activeInspectorPoint.method)}`}>
                {activeInspectorPoint.method}
              </span>
            </div>

            {/* Main Inspection Metrics */}
            <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs">Timestamp:</span>
                <span className="font-mono text-xs font-semibold text-cyan-300">
                  {new Date(activeInspectorPoint.timestamp).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs">Estimated Temp:</span>
                {activeInspectorPoint.estimatedTemperature !== null ? (
                  <span className="font-mono text-base font-bold text-slate-100">
                    {activeInspectorPoint.estimatedTemperature > 0 ? `+${activeInspectorPoint.estimatedTemperature}` : activeInspectorPoint.estimatedTemperature} °C
                  </span>
                ) : (
                  <span className="font-mono text-sm font-bold text-rose-400 italic">UNKNOWN / UNRECOVERABLE</span>
                )}
              </div>

              {activeInspectorPoint.lowerBound !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs">95% Uncertainty Bounds:</span>
                  <span className="font-mono text-xs text-purple-300 font-semibold">
                    [{activeInspectorPoint.lowerBound}°C , {activeInspectorPoint.upperBound}°C]
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400 text-xs">Confidence Score:</span>
                <ConfidenceBadge score={activeInspectorPoint.confidence * 100} showBar />
              </div>
            </div>

            {/* Evidence Used List */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">
                Evidence Sources Used ({activeInspectorPoint.evidence.length})
              </h4>
              <div className="space-y-2">
                {activeInspectorPoint.evidence.map((ev, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{ev.factor}</span>
                      <span className={`text-[10px] font-bold uppercase ${
                        ev.impact === 'positive' ? 'text-emerald-400' : ev.impact === 'negative' ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {ev.impact}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{ev.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Uncertainty Rationale */}
            <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-800/50 space-y-1 text-xs">
              <span className="font-bold text-amber-300 text-[10px] uppercase block">Uncertainty Rationale</span>
              <p className="text-slate-200 leading-relaxed">{activeInspectorPoint.uncertaintyReason}</p>
            </div>

            {/* Transparent Factor Breakdown */}
            <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
              <span className="font-bold text-slate-400 text-[10px] uppercase block">Transparent Factor Breakdown</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-slate-300">
                <div>Base Score: <span className="text-cyan-400">{(activeInspectorPoint.confidenceFactors.base * 100).toFixed(0)}%</span></div>
                <div>Duration Pen: <span className="text-amber-400">-{(activeInspectorPoint.confidenceFactors.durationPenalty * 100).toFixed(0)}%</span></div>
                <div>Conflict Pen: <span className="text-rose-400">-{(activeInspectorPoint.confidenceFactors.conflictPenalty * 100).toFixed(0)}%</span></div>
                <div>Correlation Bonus: <span className="text-emerald-400">+{(activeInspectorPoint.confidenceFactors.correlationBonus * 100).toFixed(0)}%</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Points Table */}
      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-200">Full Reconstructed Telemetry Stream Log</h3>
        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-xs uppercase bg-slate-900/90 text-slate-400 border-b border-slate-800 sticky top-0">
              <tr>
                <th scope="col" className="px-3.5 py-2.5 font-semibold">Timestamp</th>
                <th scope="col" className="px-3.5 py-2.5 font-semibold">Status</th>
                <th scope="col" className="px-3.5 py-2.5 font-semibold text-center">Estimated Temp (°C)</th>
                <th scope="col" className="px-3.5 py-2.5 font-semibold text-center">95% Bounds</th>
                <th scope="col" className="px-3.5 py-2.5 font-semibold text-center">Confidence</th>
                <th scope="col" className="px-3.5 py-2.5 font-semibold">Method</th>
                <th scope="col" className="px-3.5 py-2.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {points.map((p, idx) => (
                <tr 
                  key={idx}
                  onClick={() => setSelectedPoint(p)}
                  className={`cursor-pointer hover:bg-slate-800/40 transition-colors ${
                    selectedPoint?.timestamp === p.timestamp ? 'bg-purple-950/30 border-l-4 border-purple-500' : ''
                  }`}
                >
                  <td className="px-3.5 py-2 text-slate-300">{new Date(p.timestamp).toLocaleTimeString()}</td>
                  <td className="px-3.5 py-2 font-sans font-bold text-[10px]">
                    <span className={`px-2 py-0.5 rounded border ${
                      p.status === 'OBSERVED' ? 'bg-cyan-950 text-cyan-300 border-cyan-800' :
                      p.status === 'RECONSTRUCTED' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                      'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-2 text-center font-bold">
                    {p.estimatedTemperature !== null ? (
                      <span className={p.status === 'RECONSTRUCTED' ? 'text-purple-300' : 'text-cyan-300'}>
                        {p.estimatedTemperature > 0 ? `+${p.estimatedTemperature}` : p.estimatedTemperature} °C
                      </span>
                    ) : (
                      <span className="text-rose-400 italic">UNKNOWN</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2 text-center text-slate-400">
                    {p.lowerBound !== null ? `[${p.lowerBound}°C, ${p.upperBound}°C]` : '--'}
                  </td>
                  <td className="px-3.5 py-2 text-center">
                    <ConfidenceBadge score={p.confidence * 100} />
                  </td>
                  <td className="px-3.5 py-2 text-purple-400 font-sans font-medium text-[11px]">{p.method}</td>
                  <td className="px-3.5 py-2 text-right font-sans">
                    <button className="text-xs text-purple-400 hover:underline">Inspect Rationale</button>
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
