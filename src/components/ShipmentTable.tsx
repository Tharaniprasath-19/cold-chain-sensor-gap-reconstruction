import React from 'react';
import { Shipment } from '../types';
import { StatusBadge } from './StatusBadge';
import { ConfidenceBadge } from './ConfidenceBadge';
import { ArrowRight, ChevronRight, MapPin, Package } from 'lucide-react';

interface ShipmentTableProps {
  shipments: Shipment[];
  onSelectShipment?: (shipmentId: string) => void;
  selectedShipmentId?: string;
  limit?: number;
}

export const ShipmentTable: React.FC<ShipmentTableProps> = ({
  shipments,
  onSelectShipment,
  selectedShipmentId,
  limit,
}) => {
  const displayShipments = limit ? shipments.slice(0, limit) : shipments;

  const getRiskBadge = (risk: Shipment['riskLevel']) => {
    switch (risk) {
      case 'Critical':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-950 text-rose-400 border border-rose-800">Critical</span>;
      case 'High':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-950 text-amber-400 border border-amber-800">High</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-950 text-cyan-400 border border-cyan-800">Medium</span>;
      case 'Low':
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-950 text-emerald-400 border border-emerald-800">Low</span>;
    }
  };

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="text-xs uppercase bg-slate-900/90 text-slate-400 border-b border-slate-800">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Shipment ID</th>
            <th scope="col" className="px-4 py-3 font-semibold">Product</th>
            <th scope="col" className="px-4 py-3 font-semibold">Origin & Destination</th>
            <th scope="col" className="px-4 py-3 font-semibold">Current Leg</th>
            <th scope="col" className="px-4 py-3 font-semibold text-center">Temp (°C)</th>
            <th scope="col" className="px-4 py-3 font-semibold">Temp Status</th>
            <th scope="col" className="px-4 py-3 font-semibold">Sensor Status</th>
            <th scope="col" className="px-4 py-3 font-semibold">Confidence</th>
            <th scope="col" className="px-4 py-3 font-semibold">Risk</th>
            <th scope="col" className="px-4 py-3 font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {displayShipments.map((shp) => {
            const isSelected = selectedShipmentId === shp.id;
            return (
              <tr
                key={shp.id}
                onClick={() => onSelectShipment?.(shp.id)}
                className={`transition-colors cursor-pointer hover:bg-slate-800/40 ${
                  isSelected ? 'bg-cyan-950/30 border-l-4 border-cyan-500' : ''
                }`}
              >
                <td className="px-4 py-3.5 font-mono font-medium text-cyan-400 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                    <span>{shp.code}</span>
                  </div>
                </td>

                <td className="px-4 py-3.5">
                  <div className="font-medium text-slate-200">{shp.product}</div>
                  <div className="text-[11px] text-slate-400">{shp.totalVolumeKg.toLocaleString()} kg</div>
                </td>

                <td className="px-4 py-3.5 min-w-[200px]">
                  <div className="flex items-center gap-1 text-slate-300 truncate">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{shp.origin.split(',')[0]}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate font-medium text-slate-200">{shp.destination.split(',')[0]}</span>
                  </div>
                </td>

                <td className="px-4 py-3.5 whitespace-nowrap">
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                    {shp.currentLeg}
                  </span>
                </td>

                <td className="px-4 py-3.5 font-mono text-center">
                  <span className={`font-bold ${
                    shp.currentTemp > shp.targetTempMax ? 'text-amber-400' : 
                    shp.currentTemp < shp.targetTempMin ? 'text-cyan-400' : 'text-emerald-400'
                  }`}>
                    {shp.currentTemp > 0 ? `+${shp.currentTemp}` : shp.currentTemp} °C
                  </span>
                </td>

                <td className="px-4 py-3.5 whitespace-nowrap">
                  <StatusBadge status={shp.temperatureStatus} size="sm" />
                </td>

                <td className="px-4 py-3.5 whitespace-nowrap">
                  <StatusBadge status={shp.sensorStatus} size="sm" />
                </td>

                <td className="px-4 py-3.5 whitespace-nowrap">
                  <ConfidenceBadge score={shp.confidence} />
                </td>

                <td className="px-4 py-3.5 whitespace-nowrap">
                  {getRiskBadge(shp.riskLevel)}
                </td>

                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectShipment?.(shp.id);
                    }}
                    className="p-1.5 rounded-md hover:bg-cyan-950 text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
