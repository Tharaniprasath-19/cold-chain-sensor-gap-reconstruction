import React, { useState } from 'react';
import { Alert } from '../types';
import { 
  ShieldAlert, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  Clock, 
  ChevronRight, 
  ShieldCheck, 
  Info,
  X
} from 'lucide-react';

interface AlertTableProps {
  alerts: Alert[];
  onSelectShipment?: (shipmentId: string) => void;
}

export const AlertTable: React.FC<AlertTableProps> = ({
  alerts,
  onSelectShipment,
}) => {
  const [filterClassification, setFilterClassification] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const filteredAlerts = alerts.filter((alt) => {
    // Classification filter
    if (filterClassification === 'FALSE_ALARMS') {
      if (!alt.isFalseAlarmCandidate && alt.status !== 'LOW_CONFIDENCE_ANOMALY') return false;
    } else if (filterClassification !== 'ALL' && alt.status !== filterClassification) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const code = (alt.shipmentCode || alt.shipmentId).toLowerCase();
      const sId = (alt.sensorId || '').toLowerCase();
      const reason = (alt.reason || '').toLowerCase();
      return code.includes(q) || sId.includes(q) || reason.includes(q);
    }

    return true;
  });

  const formatTimeRange = (startIso: string, endIso: string) => {
    try {
      const d1 = new Date(startIso);
      const d2 = new Date(endIso);
      const t1 = d1.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const t2 = d2.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${t1}–${t2}`;
    } catch {
      return `${startIso.slice(11, 16)}–${endIso.slice(11, 16)}`;
    }
  };

  const getClassificationBadge = (status: Alert['status']) => {
    switch (status) {
      case 'CONFIRMED_EXPOSURE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-800">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            CONFIRMED_EXPOSURE
          </span>
        );
      case 'POSSIBLE_EXPOSURE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-purple-950/80 text-purple-300 border border-purple-800">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            POSSIBLE_EXPOSURE
          </span>
        );
      case 'LOW_CONFIDENCE_ANOMALY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            LOW_CONFIDENCE_ANOMALY
          </span>
        );
      case 'NO_ALERT':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-slate-900 text-slate-400 border border-slate-700">
            <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
            NO_ALERT
          </span>
        );
    }
  };

  const getSourceBadge = (source: Alert['source']) => {
    switch (source) {
      case 'Observed':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-950 text-cyan-300 border border-cyan-800">
            Observed
          </span>
        );
      case 'Reconstructed':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-950 text-purple-300 border border-purple-800">
            Reconstructed
          </span>
        );
      case 'Hybrid':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-950 text-indigo-300 border border-indigo-800">
            Hybrid
          </span>
        );
    }
  };

  const getConfidencePill = (conf: number) => {
    let color = 'bg-slate-800 text-slate-300 border-slate-700';
    if (conf >= 85) color = 'bg-emerald-950 text-emerald-300 border-emerald-800';
    else if (conf >= 70) color = 'bg-cyan-950 text-cyan-300 border-cyan-800';
    else if (conf >= 50) color = 'bg-amber-950 text-amber-300 border-amber-800';
    else color = 'bg-rose-950 text-rose-300 border-rose-800';

    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${color}`}>
        {conf}%
      </span>
    );
  };

  return (
    <div className="glass-panel p-5 space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilterClassification('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterClassification === 'ALL'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setFilterClassification('CONFIRMED_EXPOSURE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
              filterClassification === 'CONFIRMED_EXPOSURE'
                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                : 'bg-slate-900 text-slate-400 hover:text-rose-300 border border-slate-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            Confirmed ({alerts.filter(a => a.status === 'CONFIRMED_EXPOSURE').length})
          </button>
          <button
            onClick={() => setFilterClassification('POSSIBLE_EXPOSURE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
              filterClassification === 'POSSIBLE_EXPOSURE'
                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                : 'bg-slate-900 text-slate-400 hover:text-purple-300 border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Possible ({alerts.filter(a => a.status === 'POSSIBLE_EXPOSURE').length})
          </button>
          <button
            onClick={() => setFilterClassification('LOW_CONFIDENCE_ANOMALY')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
              filterClassification === 'LOW_CONFIDENCE_ANOMALY'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-slate-900 text-slate-400 hover:text-amber-300 border border-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Low Confidence ({alerts.filter(a => a.status === 'LOW_CONFIDENCE_ANOMALY').length})
          </button>
          <button
            onClick={() => setFilterClassification('FALSE_ALARMS')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
              filterClassification === 'FALSE_ALARMS'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'bg-slate-900 text-slate-400 hover:text-cyan-300 border border-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            False Alarm Candidates ({alerts.filter(a => a.isFalseAlarmCandidate || a.status === 'LOW_CONFIDENCE_ANOMALY').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative shrink-0 w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search shipment, sensor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 text-xs rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-600 text-slate-200"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
              <th className="py-3 px-4">Shipment</th>
              <th className="py-3 px-4">Time</th>
              <th className="py-3 px-4">Temperature</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Confidence</th>
              <th className="py-3 px-4">Source</th>
              <th className="py-3 px-4">Classification</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-3 text-center">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                  <CheckCircle className="w-6 h-6 text-emerald-500/50 mx-auto mb-2" />
                  No thermal alerts found matching the current criteria.
                </td>
              </tr>
            ) : (
              filteredAlerts.map((alt) => {
                const isConfirmed = alt.status === 'CONFIRMED_EXPOSURE';
                const isPossible = alt.status === 'POSSIBLE_EXPOSURE';

                return (
                  <tr
                    key={alt.id}
                    onClick={() => setSelectedAlert(alt)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors duration-150 group"
                  >
                    {/* Shipment */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-200 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectShipment?.(alt.shipmentId);
                          }}
                          className="hover:text-cyan-400 transition-colors"
                        >
                          {alt.shipmentCode || alt.shipmentId}
                        </button>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 font-normal">
                        {alt.sensorId}
                      </div>
                    </td>

                    {/* Time */}
                    <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{formatTimeRange(alt.startTime, alt.endTime)}</span>
                      </div>
                    </td>

                    {/* Temperature */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`font-mono font-bold text-sm ${
                        isConfirmed 
                          ? 'text-rose-400' 
                          : isPossible 
                          ? 'text-purple-400' 
                          : 'text-amber-400'
                      }`}>
                        {alt.maximumTemperature > 0 ? `+${alt.maximumTemperature}` : alt.maximumTemperature}°C
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Limit: {alt.threshold}°C
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {alt.durationMinutes} min
                    </td>

                    {/* Confidence */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getConfidencePill(alt.confidence)}
                    </td>

                    {/* Source */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getSourceBadge(alt.source)}
                    </td>

                    {/* Classification */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getClassificationBadge(alt.status)}
                    </td>

                    {/* Recommended Action */}
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={alt.recommendedAction}>
                      <span className="text-[11px] leading-tight block">
                        {alt.recommendedAction}
                      </span>
                    </td>

                    {/* Detail link */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors inline-block" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Alert Inspection Modal Drawer */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-2xl bg-slate-900 border border-slate-700/80 p-6 rounded-2xl shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  {getClassificationBadge(selectedAlert.status)}
                  {getSourceBadge(selectedAlert.source)}
                </div>
                <h3 className="text-base font-bold text-slate-100 mt-2">
                  Thermal Alert Inspection: {selectedAlert.shipmentCode || selectedAlert.shipmentId}
                </h3>
                <p className="text-xs text-slate-400">
                  Sensor: <span className="font-mono text-cyan-400">{selectedAlert.sensorId}</span> • 
                  Window: <span className="font-mono text-slate-300">{formatTimeRange(selectedAlert.startTime, selectedAlert.endTime)}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedAlert(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metric Callouts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Max Temperature</span>
                <span className="text-base font-bold text-rose-400">
                  {selectedAlert.maximumTemperature > 0 ? `+${selectedAlert.maximumTemperature}` : selectedAlert.maximumTemperature}°C
                </span>
                <span className="text-[10px] text-slate-500 block">Thresh: {selectedAlert.threshold}°C</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Duration</span>
                <span className="text-base font-bold text-amber-400">{selectedAlert.durationMinutes} min</span>
                <span className="text-[10px] text-slate-500 block">Sustained excursion</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Confidence</span>
                <span className="text-base font-bold text-cyan-400">{selectedAlert.confidence}%</span>
                <span className="text-[10px] text-slate-500 block">Uncertainty model</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">False Alarm Risk</span>
                <span className={`text-base font-bold ${selectedAlert.isFalseAlarmCandidate ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {selectedAlert.isFalseAlarmCandidate ? 'High' : 'Low'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {selectedAlert.isFalseAlarmCandidate ? 'Candidate flag' : 'Ground truth breach'}
                </span>
              </div>
            </div>

            {/* Rationale and Evidence */}
            <div className="space-y-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 text-xs">
              <div>
                <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  Engineering Reason & Telemetry Context:
                </h4>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  {selectedAlert.reason}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Recommended Operational Action:
                </h4>
                <p className="text-cyan-300 mt-1 font-medium leading-relaxed">
                  {selectedAlert.recommendedAction}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  onSelectShipment?.(selectedAlert.shipmentId);
                  setSelectedAlert(null);
                }}
                className="px-4 py-2 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-lg text-xs font-semibold hover:bg-cyan-900 transition-colors"
              >
                Inspect Shipment Details
              </button>

              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
