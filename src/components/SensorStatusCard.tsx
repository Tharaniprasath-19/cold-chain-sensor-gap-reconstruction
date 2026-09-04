import React from 'react';
import { Sensor } from '../types';
import { StatusBadge } from './StatusBadge';
import { Battery, Wifi, Calendar, Cpu, Clock } from 'lucide-react';

interface SensorStatusCardProps {
  sensor: Sensor;
  onClick?: () => void;
}

export const SensorStatusCard: React.FC<SensorStatusCardProps> = ({ sensor, onClick }) => {
  const getBatteryColor = (level: number) => {
    if (level > 60) return 'text-emerald-400';
    if (level > 25) return 'text-amber-400';
    return 'text-rose-400 animate-pulse';
  };

  const getSignalIcon = (rssi: number) => {
    if (rssi > -65) return <Wifi className="w-4 h-4 text-emerald-400" />;
    if (rssi > -85) return <Wifi className="w-4 h-4 text-cyan-400" />;
    return <Wifi className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div 
      onClick={onClick}
      className="glass-panel-hover p-4 flex flex-col justify-between gap-3 cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-xs font-semibold text-cyan-300">{sensor.serialNumber}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{sensor.model}</p>
        </div>
        <StatusBadge status={sensor.status} size="sm" />
      </div>

      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-xs flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-slate-400">Node Type:</span>
          <span className="font-medium text-slate-200">{sensor.type}</span>
        </div>
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-slate-400">Location:</span>
          <span className="font-medium text-slate-200 truncate max-w-[150px]">{sensor.location}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5">
          <Battery className={`w-4 h-4 ${getBatteryColor(sensor.batteryLevel)}`} />
          <span className="font-mono text-slate-300">{sensor.batteryLevel}% Bat</span>
        </div>

        <div className="flex items-center gap-1.5">
          {getSignalIcon(sensor.signalStrengthRssi)}
          <span className="font-mono text-slate-300">{sensor.signalStrengthRssi} dBm</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          <span className="truncate">{new Date(sensor.lastPing).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <Calendar className="w-3.5 h-3.5" />
          <span className={`text-[11px] font-medium ${sensor.calibrationStatus === 'Due Soon' ? 'text-amber-400' : 'text-slate-300'}`}>
            Cal: {sensor.calibrationStatus}
          </span>
        </div>
      </div>
    </div>
  );
};
