import React, { useState } from 'react';
import { Gap, Shipment, SensorReading } from '../types';
import { KPICard } from '../components/KPICard';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { TelemetryTimeline } from '../components/TelemetryTimeline';
import { PageKey } from '../components/Sidebar';
import { 
  Activity, 
  Sparkles, 
  Clock, 
  AlertTriangle, 
  Radio, 
  ShieldAlert, 
  Info, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  X,
  Sparkle
} from 'lucide-react';

interface GapAnalysisPageProps {
  gaps: Gap[];
  shipments: Shipment[];
  readings: SensorReading[];
  onSelectShipment: (shipmentId: string) => void;
  onNavigate: (page: PageKey) => void;
}

export const GapAnalysisPage: React.FC<GapAnalysisPageProps> = ({
  gaps,
  shipments,
  readings,
  onSelectShipment,
  onNavigate,
}) => {
  const [selectedGapId, setSelectedGapId] = useState<string>(gaps[0]?.id || '');
  const [filterShipment, setFilterShipment] = useState<string>('All');
  const [filterSensor, setFilterSensor] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterSeverity, setFilterSeverity] = useState<string>('All');
  const [filterLeg, setFilterLeg] = useState<string>('All');
  const [showDrawer, setShowDrawer] = useState<boolean>(true);

  // Filter Gaps
  const filteredGaps = gaps.filter((gap) => {
    if (filterShipment !== 'All' && gap.shipmentId !== filterShipment) return false;
    if (filterSensor !== 'All' && gap.sensorId !== filterSensor) return false;
    if (filterType !== 'All' && gap.gapType !== filterType) return false;
    if (filterSeverity !== 'All' && gap.severity !== filterSeverity) return false;
    if (filterLeg !== 'All' && gap.legName !== filterLeg) return false;
    return true;
  });

  const selectedGap = gaps.find((g) => g.id === selectedGapId) || gaps[0];
  const relatedShipment = shipments.find((s) => s.id === selectedGap?.shipmentId) || shipments[0];
  const shipmentReadings = readings.filter((r) => r.shipment_id === relatedShipment?.id);

  // KPI Calculations
  const totalGaps = gaps.length;
  const totalDuration = gaps.reduce((acc, g) => acc + g.durationMinutes, 0);
  const longGapsCount = gaps.filter((g) => g.durationMinutes >= 60).length;
  const deadSensorsCount = gaps.filter((g) => g.gapType === 'DEAD_SENSOR').length;
  const networkOutagesCount = gaps.filter((g) => g.gapType === 'NETWORK_OUTAGE').length;
  const calibrationCount = gaps.filter((g) => g.gapType === 'CALIBRATION_ISSUE').length;

  const getThermalRiskBadge = (risk: Gap['thermalRisk']) => {
    switch (risk) {
      case 'Confirmed exposure':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">Confirmed Exposure</span>;
      case 'Potential exposure':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-950 text-amber-300 border border-amber-800">Potential Exposure</span>;
      case 'Unknown':
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-purple-950 text-purple-300 border border-purple-800">Unknown Risk</span>;
      case 'Missing':
      default:
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-800 text-slate-300 border border-slate-700">Missing (Safe)</span>;
    }
  };

  const getTrendIcon = (trend: Gap['precedingTrend']) => {
    if (trend === 'Warming') return <TrendingUp className="w-3.5 h-3.5 text-amber-400" />;
    if (trend === 'Cooling') return <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />;
    return <Minus className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-400" />
            Sensor-Gap Detection Engine & Thermal Risk Analysis
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Automated pattern recognition identifying missing pings, continuous dropouts, dead sensor nodes, and thermal exposure risks.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('reconstruction')}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-slate-100 font-semibold text-xs rounded-lg shadow-lg shadow-purple-950/50 transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-slate-100" />
            <span>Launch Reconstruction Engine</span>
          </button>
        </div>
      </div>

      {/* Prominent Rule Banner */}
      <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/80 flex items-start gap-3">
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-cyan-300 text-xs uppercase tracking-wide">
            Logistics Rule: "Sensor silence does not equal confirmed product exposure."
          </h4>
          <p className="text-slate-300 leading-relaxed">
            Missing telemetry is categorized strictly into: <strong className="text-slate-100">Missing</strong> (routine dropout), <strong className="text-purple-300">Unknown</strong> (unmonitored leg), <strong className="text-amber-300">Potential exposure</strong> (preceding temperature rise), and <strong className="text-rose-400">Confirmed exposure</strong> (measured thermal breach).
          </p>
        </div>
      </div>

      {/* 6 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Gaps"
          value={totalGaps}
          subtitle="Detected Anomalies"
          icon={Activity}
          variant="amber"
        />

        <KPICard
          title="Total Gap Duration"
          value={`${totalDuration}m`}
          subtitle="Cumulative Blackout"
          icon={Clock}
          variant="cyan"
        />

        <KPICard
          title="Long Gaps (>60m)"
          value={longGapsCount}
          subtitle="Extended Outages"
          icon={AlertTriangle}
          variant="rose"
        />

        <KPICard
          title="Dead Sensor Periods"
          value={deadSensorsCount}
          subtitle="Leg Disconnects"
          icon={Radio}
          variant="purple"
        />

        <KPICard
          title="Network Outages"
          value={networkOutagesCount}
          subtitle="RF / Cell Shielding"
          icon={ShieldAlert}
          variant="blue"
        />

        <KPICard
          title="Calibration Issues"
          value={calibrationCount}
          subtitle="Sensor Drift Bias"
          icon={Activity}
          variant="emerald"
        />
      </div>

      {/* Visual Timeline Section */}
      {relatedShipment && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                Visual Telemetry Timeline & Journey Stage Map
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Telemetry stream for {relatedShipment.code} ({relatedShipment.product})
              </p>
            </div>
            <button
              onClick={() => onNavigate('shipment-detail')}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-medium"
            >
              <span>View Full Shipment Details</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <TelemetryTimeline
            readings={shipmentReadings}
            gaps={gaps.filter((g) => g.shipmentId === relatedShipment.id)}
            targetTempMin={relatedShipment.targetTempMin}
            targetTempMax={relatedShipment.targetTempMax}
          />
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Shipment:</span>
            <select
              value={filterShipment}
              onChange={(e) => setFilterShipment(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none font-mono"
            >
              <option value="All" className="bg-slate-900">All Shipments</option>
              {shipments.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900">
                  {s.code}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Sensor:</span>
            <select
              value={filterSensor}
              onChange={(e) => setFilterSensor(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none font-mono"
            >
              <option value="All" className="bg-slate-900">All Sensors</option>
              {Array.from(new Set(gaps.map((g) => g.sensorId))).map((snsId) => (
                <option key={snsId} value={snsId} className="bg-slate-900">
                  {snsId}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Gap Type:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none font-medium"
            >
              <option value="All" className="bg-slate-900">All Gap Types</option>
              <option value="RANDOM_DROPOUT" className="bg-slate-900">RANDOM_DROPOUT</option>
              <option value="NETWORK_OUTAGE" className="bg-slate-900">NETWORK_OUTAGE</option>
              <option value="DEAD_SENSOR" className="bg-slate-900">DEAD_SENSOR</option>
              <option value="LOW_SIGNAL" className="bg-slate-900">LOW_SIGNAL</option>
              <option value="CLOCK_SKEW" className="bg-slate-900">CLOCK_SKEW</option>
              <option value="NOISY_SENSOR" className="bg-slate-900">NOISY_SENSOR</option>
              <option value="CALIBRATION_ISSUE" className="bg-slate-900">CALIBRATION_ISSUE</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Journey Leg:</span>
            <select
              value={filterLeg}
              onChange={(e) => setFilterLeg(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none font-medium"
            >
              <option value="All" className="bg-slate-900">All Journey Legs</option>
              <option value="Cold Storage Facility" className="bg-slate-900">Cold Storage</option>
              <option value="Reefer Truck Transport" className="bg-slate-900">Truck Transport</option>
              <option value="Port Cargo Staging" className="bg-slate-900">Port Staging</option>
              <option value="Ocean Vessel Transit" className="bg-slate-900">Vessel Transit</option>
              <option value="Air Freight Cargo" className="bg-slate-900">Air Freight</option>
              <option value="Customs Inspection" className="bg-slate-900">Customs Inspection</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Severity:</span>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none font-medium"
            >
              <option value="All" className="bg-slate-900">All Severities</option>
              <option value="Low" className="bg-slate-900">Low</option>
              <option value="Medium" className="bg-slate-900">Medium</option>
              <option value="High" className="bg-slate-900">High</option>
              <option value="Critical" className="bg-slate-900">Critical</option>
            </select>
          </div>
        </div>

        <span className="text-slate-400 font-mono text-[11px]">
          Showing <strong>{filteredGaps.length}</strong> of {gaps.length} detected gaps
        </span>
      </div>

      {/* Main Grid: Gap Table + Inspector Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Gap Table */}
        <div className="lg:col-span-2 glass-panel p-5 space-y-4">
          <h3 className="font-bold text-sm text-slate-200">Detected Sensor Gaps Directory</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-xs uppercase bg-slate-900/90 text-slate-400 border-b border-slate-800">
                <tr>
                  <th scope="col" className="px-3 py-3 font-semibold">Shipment</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Sensor</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Duration</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Gap Type</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Severity</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Thermal Risk</th>
                  <th scope="col" className="px-3 py-3 font-semibold text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {filteredGaps.map((gap) => {
                  const shp = shipments.find((s) => s.id === gap.shipmentId);
                  const isSelected = gap.id === selectedGapId;

                  return (
                    <tr
                      key={gap.id}
                      onClick={() => {
                        setSelectedGapId(gap.id);
                        setShowDrawer(true);
                      }}
                      className={`cursor-pointer transition-colors hover:bg-slate-800/50 ${
                        isSelected ? 'bg-amber-950/30 border-l-4 border-amber-500' : ''
                      }`}
                    >
                      <td className="px-3 py-3 font-bold text-cyan-400 whitespace-nowrap">
                        {shp?.code || gap.shipmentId}
                      </td>

                      <td className="px-3 py-3 text-slate-300 whitespace-nowrap">
                        {gap.sensorId}
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-bold text-amber-300">
                          {gap.durationMinutes} m
                        </span>
                      </td>

                      <td className="px-3 py-3 font-semibold text-purple-400 whitespace-nowrap">
                        {gap.gapType}
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap font-sans">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${
                          gap.severity === 'Critical' ? 'bg-rose-950 text-rose-300 border-rose-800' :
                          gap.severity === 'High' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                          gap.severity === 'Medium' ? 'bg-cyan-950 text-cyan-300 border-cyan-800' :
                          'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {gap.severity}
                        </span>
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap font-sans">
                        {getThermalRiskBadge(gap.thermalRisk)}
                      </td>

                      <td className="px-3 py-3 text-right whitespace-nowrap font-sans">
                        <button className="text-xs text-cyan-400 hover:underline font-medium">
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Column: Gap Inspector Drawer */}
        {selectedGap && showDrawer && (
          <div className="glass-panel p-5 space-y-5 border-amber-900/40">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-200">Gap Anomaly Inspector</h3>
                <p className="text-[11px] font-mono text-cyan-400">{selectedGap.id}</p>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Shipment Code:</span>
                  <button
                    onClick={() => {
                      onSelectShipment(selectedGap.shipmentId);
                      onNavigate('shipment-detail');
                    }}
                    className="font-mono font-bold text-cyan-400 hover:underline"
                  >
                    {relatedShipment?.code}
                  </button>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sensor ID:</span>
                  <span className="font-mono text-slate-300">{selectedGap.sensorId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Transport Leg:</span>
                  <span className="font-medium text-slate-200">{selectedGap.legName}</span>
                </div>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Gap Pattern Type:</span>
                  <span className="font-mono font-bold text-purple-400">{selectedGap.gapType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Blackout Duration:</span>
                  <span className="font-mono font-bold text-amber-400">{selectedGap.durationMinutes} Minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Start Time:</span>
                  <span className="font-mono text-slate-300">{new Date(selectedGap.startTime).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">End Time:</span>
                  <span className="font-mono text-slate-300">{new Date(selectedGap.endTime).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Thermal Trends & Risk */}
              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Preceding Trend:</span>
                  <span className="font-medium text-slate-200 flex items-center gap-1">
                    {getTrendIcon(selectedGap.precedingTrend)}
                    {selectedGap.precedingTrend}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Following Trend:</span>
                  <span className="font-medium text-slate-200 flex items-center gap-1">
                    {getTrendIcon(selectedGap.followingTrend)}
                    {selectedGap.followingTrend}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Known Temp:</span>
                  <span className="font-mono font-bold text-slate-100">{selectedGap.lastKnownTemperature} °C</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Thermal Risk:</span>
                  {getThermalRiskBadge(selectedGap.thermalRisk)}
                </div>
              </div>

              {/* Correlated Sensors */}
              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Correlated Sensors on Shipment</span>
                <div className="flex flex-wrap gap-1">
                  {selectedGap.correlatedSensors.map((sId) => (
                    <span key={sId} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-cyan-300">
                      {sId}
                    </span>
                  ))}
                </div>
              </div>

              {/* Confidence Meter */}
              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Reconstruction Confidence</span>
                <ConfidenceBadge score={selectedGap.confidence} showBar />
              </div>
            </div>

            <button
              onClick={() => onNavigate('reconstruction')}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-cyan-950/50 transition-all flex items-center justify-center gap-2"
            >
              <Sparkle className="w-4 h-4 text-slate-950 fill-slate-950" />
              <span>Reconstruct Missing Profile</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
