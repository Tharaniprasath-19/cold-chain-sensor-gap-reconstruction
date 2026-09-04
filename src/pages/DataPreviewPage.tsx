import React, { useState } from 'react';
import { SimulationControls } from '../components/SimulationControls';
import { SimulationResult } from '../services/simulator/shipmentSimulator';
import { 
  Database, 
  Search, 
  Eye, 
  EyeOff, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';

interface DataPreviewPageProps {
  simulationResult: SimulationResult;
  onUpdateSimulation: (newConfig: any) => void;
  onResetSimulation: () => void;
  onLoadDemoSimulation: () => void;
}

export const DataPreviewPage: React.FC<DataPreviewPageProps> = ({
  simulationResult,
  onUpdateSimulation,
  onResetSimulation,
  onLoadDemoSimulation,
}) => {
  const [showGroundTruth, setShowGroundTruth] = useState<boolean>(false);
  const [filterShipment, setFilterShipment] = useState<string>('All');
  const [filterSensor, setFilterSensor] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 25;

  const { readings, shipments, sensors, summary, config } = simulationResult;

  // Filter Readings
  const filteredReadings = readings.filter((rdg) => {
    if (filterShipment !== 'All' && rdg.shipment_id !== filterShipment) return false;
    if (filterSensor !== 'All' && rdg.sensor_id !== filterSensor) return false;
    if (filterStatus !== 'All' && rdg.status !== filterStatus) return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        rdg.shipment_id.toLowerCase().includes(q) ||
        rdg.sensor_id.toLowerCase().includes(q) ||
        rdg.leg_name.toLowerCase().includes(q) ||
        rdg.timestamp.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredReadings.length / pageSize) || 1;
  const paginatedReadings = filteredReadings.slice((page - 1) * pageSize, page * pageSize);

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Observed':
        return 'bg-sky-950/80 text-sky-300 border-sky-800';
      case 'Dropped':
        return 'bg-rose-950/80 text-rose-300 border-rose-800 animate-pulse';
      case 'Buffered':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'Unknown':
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Simulation Parameter Controls Component */}
      <SimulationControls
        config={config}
        summary={summary}
        onGenerate={onUpdateSimulation}
        onReset={onResetSimulation}
        onLoadDemo={onLoadDemoSimulation}
      />

      {/* Raw Data Inspector Toolbar */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-400" />
              Raw Telemetry Data Preview & Ground Truth Inspector
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect generated sensor stream logs, clock skew offsets, battery drain curves, and hidden ground truth temperatures.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Ground Truth Toggle Button */}
            <button
              onClick={() => setShowGroundTruth(!showGroundTruth)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                showGroundTruth
                  ? 'bg-purple-950 text-purple-300 border-purple-700 shadow-md shadow-purple-950/50'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {showGroundTruth ? (
                <>
                  <Eye className="w-4 h-4 text-purple-400" />
                  <span>Ground Truth: REVEALED</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 text-slate-400" />
                  <span>Reveal Ground Truth</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Shipment Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Shipment:</span>
              <select
                value={filterShipment}
                onChange={(e) => {
                  setFilterShipment(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-slate-200 focus:outline-none font-mono"
              >
                <option value="All" className="bg-slate-900">All Shipments</option>
                {shipments.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900">
                    {s.code} ({s.product.split(' ')[0]})
                  </option>
                ))}
              </select>
            </div>

            {/* Sensor Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Sensor:</span>
              <select
                value={filterSensor}
                onChange={(e) => {
                  setFilterSensor(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-slate-200 focus:outline-none font-mono"
              >
                <option value="All" className="bg-slate-900">All Sensors</option>
                {sensors.map((sns) => (
                  <option key={sns.id} value={sns.id} className="bg-slate-900">
                    {sns.serialNumber} ({sns.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-slate-200 focus:outline-none font-medium"
              >
                <option value="All" className="bg-slate-900">All Statuses</option>
                <option value="Observed" className="bg-slate-900">Observed</option>
                <option value="Dropped" className="bg-slate-900">Dropped</option>
                <option value="Buffered" className="bg-slate-900">Buffered</option>
                <option value="Unknown" className="bg-slate-900">Unknown</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search readings..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Telemetry Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-xs uppercase bg-slate-900/90 text-slate-400 border-b border-slate-800">
              <tr>
                <th scope="col" className="px-3.5 py-3 font-semibold">Timestamp (Device)</th>
                <th scope="col" className="px-3.5 py-3 font-semibold">Shipment</th>
                <th scope="col" className="px-3.5 py-3 font-semibold">Sensor ID</th>
                <th scope="col" className="px-3.5 py-3 font-semibold text-center">
                  Temp (°C) {showGroundTruth && <span className="text-purple-400 text-[10px] lowercase block">[Truth vs Obs]</span>}
                </th>
                <th scope="col" className="px-3.5 py-3 font-semibold text-center">Humidity</th>
                <th scope="col" className="px-3.5 py-3 font-semibold text-center">Shock / Tilt</th>
                <th scope="col" className="px-3.5 py-3 font-semibold text-center">Signal (dBm)</th>
                <th scope="col" className="px-3.5 py-3 font-semibold text-center">Battery</th>
                <th scope="col" className="px-3.5 py-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {paginatedReadings.map((rdg) => {
                const shp = shipments.find(s => s.id === rdg.shipment_id);
                const isDropped = rdg.status === 'Dropped';

                return (
                  <tr key={rdg.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-3.5 py-2.5 text-slate-300 whitespace-nowrap">
                      <div>{new Date(rdg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                      <div className="text-[10px] text-slate-500 font-sans">{rdg.clock_skew_seconds > 0 ? `+${rdg.clock_skew_seconds}s skew` : `${rdg.clock_skew_seconds}s skew`}</div>
                    </td>

                    <td className="px-3.5 py-2.5 font-bold text-cyan-400 whitespace-nowrap">
                      {shp?.code || rdg.shipment_id}
                    </td>

                    <td className="px-3.5 py-2.5 text-slate-300 whitespace-nowrap">
                      {rdg.sensor_id}
                    </td>

                    <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                      {isDropped ? (
                        <span className="text-rose-400 italic">-- [Dropped]</span>
                      ) : (
                        <span className="font-bold text-emerald-400">
                          {rdg.observed_temperature! > 0 ? `+${rdg.observed_temperature}` : rdg.observed_temperature} °C
                        </span>
                      )}

                      {showGroundTruth && (
                        <div className="text-[10px] text-purple-300 font-medium">
                          Truth: {rdg.ground_truth_temperature > 0 ? `+${rdg.ground_truth_temperature}` : rdg.ground_truth_temperature} °C
                        </div>
                      )}
                    </td>

                    <td className="px-3.5 py-2.5 text-center text-slate-300 whitespace-nowrap">
                      {rdg.humidity}%
                    </td>

                    <td className="px-3.5 py-2.5 text-center text-slate-300 whitespace-nowrap">
                      <span className={rdg.shock > 1.0 ? 'text-amber-400 font-bold' : ''}>
                        {rdg.shock}g
                      </span> / {rdg.tilt}°
                    </td>

                    <td className="px-3.5 py-2.5 text-center text-slate-300 whitespace-nowrap">
                      <span className={rdg.signal_strength < -100 ? 'text-amber-400' : 'text-slate-300'}>
                        {rdg.signal_strength} dBm
                      </span>
                    </td>

                    <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                      <span className={rdg.battery_level < 20 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        {rdg.battery_level}%
                      </span>
                    </td>

                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded font-sans font-bold text-[10px] border ${getStatusBadgeStyle(rdg.status)}`}>
                        {rdg.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
          <div>
            Showing <strong>{(page - 1) * pageSize + 1}</strong> to <strong>{Math.min(page * pageSize, filteredReadings.length)}</strong> of <strong>{filteredReadings.length}</strong> telemetry entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-md bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-slate-300">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-md bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
