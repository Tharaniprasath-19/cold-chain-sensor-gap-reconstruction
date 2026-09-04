import React, { useState } from 'react';
import { Sensor } from '../types';
import { SensorStatusCard } from '../components/SensorStatusCard';
import { Radio, BatteryCharging, Search, ShieldCheck } from 'lucide-react';

interface SensorMonitoringPageProps {
  sensors: Sensor[];
  onSelectSensor?: (sensorId: string) => void;
}

export const SensorMonitoringPage: React.FC<SensorMonitoringPageProps> = ({
  sensors,
  onSelectSensor,
}) => {
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [search, setSearch] = useState('');

  const filteredSensors = sensors.filter((s) => {
    if (filterType !== 'All' && s.type !== filterType) return false;
    if (filterStatus !== 'All' && s.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.serialNumber.toLowerCase().includes(q) ||
        s.model.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const healthyCount = sensors.filter(s => s.status === 'Healthy' || s.status === 'Observed').length;
  const avgBattery = Math.round(sensors.reduce((acc, s) => acc + s.batteryLevel, 0) / (sensors.length || 1));

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            Sensor Fleet Monitoring & Telemetry Nodes
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status of IoT gateways, BLE probes, satellite loggers, and NIST-traceable thermal sensors across global export routes.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Fleet Health</span>
              <span className="font-semibold text-slate-200">{healthyCount}/{sensors.length} Active</span>
            </div>
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div className="flex items-center gap-2">
            <BatteryCharging className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Avg Battery</span>
              <span className="font-mono font-semibold text-slate-200">{avgBattery}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Type:</span>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none font-medium"
            >
              <option value="All" className="bg-slate-900">All Node Types</option>
              <option value="IoT Gateway" className="bg-slate-900">IoT Gateway</option>
              <option value="BLE Sensor Node" className="bg-slate-900">BLE Sensor Node</option>
              <option value="Satellite Thermal Tracker" className="bg-slate-900">Satellite Tracker</option>
              <option value="Deep-Chill Probe" className="bg-slate-900">Deep-Chill Probe</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Status:</span>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none font-medium"
            >
              <option value="All" className="bg-slate-900">All Statuses</option>
              <option value="Healthy" className="bg-slate-900">Healthy</option>
              <option value="Observed" className="bg-slate-900">Observed</option>
              <option value="Warning" className="bg-slate-900">Warning</option>
              <option value="Critical" className="bg-slate-900">Critical</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search serial number, model, location..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Sensor Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSensors.map((sensor) => (
          <SensorStatusCard
            key={sensor.id}
            sensor={sensor}
            onClick={() => onSelectSensor?.(sensor.id)}
          />
        ))}
      </div>
    </div>
  );
};
