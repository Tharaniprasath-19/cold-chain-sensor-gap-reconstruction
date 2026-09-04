import React, { useState } from 'react';
import { Shipment } from '../types';
import { ShipmentTable } from '../components/ShipmentTable';
import { PageKey } from '../components/Sidebar';
import { Ship, Search, Download } from 'lucide-react';

interface ShipmentsPageProps {
  shipments: Shipment[];
  onSelectShipment: (id: string) => void;
  onNavigate: (page: PageKey) => void;
}

export const ShipmentsPage: React.FC<ShipmentsPageProps> = ({
  shipments,
  onSelectShipment,
  onNavigate,
}) => {
  const [filterTab, setFilterTab] = useState<'All' | 'High Risk' | 'Customs' | 'Reefer/Ocean' | 'Air Cargo'>('All');
  const [localSearch, setLocalSearch] = useState('');

  const filteredShipments = shipments.filter((s) => {
    // Filter Tab match
    if (filterTab === 'High Risk' && s.riskLevel !== 'High' && s.riskLevel !== 'Critical') return false;
    if (filterTab === 'Customs' && s.currentLeg !== 'Customs Inspection') return false;
    if (filterTab === 'Reefer/Ocean' && s.currentLeg !== 'Reefer Truck Transport' && s.currentLeg !== 'Ocean Vessel Transit') return false;
    if (filterTab === 'Air Cargo' && s.currentLeg !== 'Air Freight Cargo') return false;

    // Search query match
    if (localSearch) {
      const q = localSearch.toLowerCase();
      return (
        s.code.toLowerCase().includes(q) ||
        s.product.toLowerCase().includes(q) ||
        s.origin.toLowerCase().includes(q) ||
        s.destination.toLowerCase().includes(q) ||
        s.exportCertNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Ship className="w-5 h-5 text-cyan-400" />
            Seafood Export Shipment Directory
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Comprehensive tracking of all live containerized seafood consignments, thermal envelopes, and sensor gap histories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => alert('Exporting CSV manifest report...')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export Manifest</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {(['All', 'High Risk', 'Customs', 'Reefer/Ocean', 'Air Cargo'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterTab === tab
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Local Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Filter shipments..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Shipment Table Container */}
      <div className="glass-panel p-5 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Showing <strong>{filteredShipments.length}</strong> of {shipments.length} active consignments</span>
          <span className="font-mono text-[11px]">Sorted by creation date</span>
        </div>

        <ShipmentTable
          shipments={filteredShipments}
          onSelectShipment={(id) => {
            onSelectShipment(id);
            onNavigate('shipment-detail');
          }}
        />
      </div>
    </div>
  );
};
