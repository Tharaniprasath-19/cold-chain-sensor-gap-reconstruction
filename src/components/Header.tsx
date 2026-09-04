import React, { useState } from 'react';
import { Shipment } from '../types';
import { 
  Search, 
  RefreshCw, 
  ChevronDown, 
  CheckCircle2, 
  SlidersHorizontal 
} from 'lucide-react';

interface HeaderProps {
  shipments: Shipment[];
  selectedShipmentId: string;
  onSelectShipment: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  shipments,
  selectedShipmentId,
  onSelectShipment,
  searchQuery,
  onSearchChange,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('2 mins ago');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime('Just now');
    }, 800);
  };

  return (
    <header className="h-16 bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
      {/* Left: Shipment Selector & Search */}
      <div className="flex items-center gap-4 flex-1 max-w-2xl">
        {/* Shipment Selector */}
        <div className="relative shrink-0">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 focus-within:border-cyan-500">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <select
              value={selectedShipmentId}
              onChange={(e) => onSelectShipment(e.target.value)}
              className="bg-transparent text-xs font-mono font-medium text-slate-200 focus:outline-none cursor-pointer pr-2"
            >
              {shipments.map((shp) => (
                <option key={shp.id} value={shp.id} className="bg-slate-900 text-slate-200">
                  {shp.code} - {shp.product.split(' ')[0]} ({shp.currentLeg})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search shipment ID, product, sensor SN, route or port..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Right: Status, Sync & Profile */}
      <div className="flex items-center gap-4 text-xs">
        {/* System Status Pill */}
        <div className="hidden lg:flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-full text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="font-semibold text-[11px]">System Status: Nominal (97.8% Telemetry Sync)</span>
        </div>

        {/* Sync Trigger */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-300 hover:text-cyan-400 transition-colors"
          title="Force telemetry data sync"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
          <span className="font-mono text-[11px]">Sync: {lastSyncTime}</span>
        </button>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <div className="w-7 h-7 rounded-md bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 font-bold text-xs">
              AT
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-200">Dr. Aris Thorne</p>
              <p className="text-[10px] text-slate-400">QA Logistics Director</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-2 z-50">
              <div className="px-3 py-2 border-b border-slate-800">
                <p className="font-semibold text-xs text-slate-200">Dr. Aris Thorne</p>
                <p className="text-[10px] text-slate-400">a.thorne@coldchaininsight.io</p>
              </div>
              <div className="py-1">
                <button className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-md">
                  Exporter Profile
                </button>
                <button className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-md">
                  Sensor Threshold Config
                </button>
                <button className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-md">
                  Audit Export Log
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
