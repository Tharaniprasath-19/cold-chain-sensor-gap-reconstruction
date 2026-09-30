import React from 'react';
import { Alert } from '../types';
import { AlertTriangle, AlertCircle, Info, Clock, ArrowUpRight } from 'lucide-react';

interface EventCardProps {
  alert: Alert;
  onSelectShipment?: (shipmentId: string) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ alert, onSelectShipment }) => {
  const getSeverityStyle = (severity: Alert['severity']) => {
    switch (severity) {
      case 'Critical':
        return {
          border: 'border-rose-800/80 bg-rose-950/40',
          badge: 'bg-rose-900/80 text-rose-300 border-rose-700',
          icon: AlertCircle,
          iconColor: 'text-rose-400',
        };
      case 'Warning':
        return {
          border: 'border-amber-800/80 bg-amber-950/40',
          badge: 'bg-amber-900/80 text-amber-300 border-amber-700',
          icon: AlertTriangle,
          iconColor: 'text-amber-400',
        };
      case 'Info':
      default:
        return {
          border: 'border-sky-800/80 bg-sky-950/40',
          badge: 'bg-sky-900/80 text-sky-300 border-sky-700',
          icon: Info,
          iconColor: 'text-sky-400',
        };
    }
  };

  const style = getSeverityStyle(alert.severity);
  const Icon = style.icon;

  return (
    <div className={`p-3.5 rounded-xl border ${style.border} transition-all duration-150 hover:bg-slate-900/90`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 shrink-0 ${style.iconColor}`} />
          <h4 className="font-semibold text-xs text-slate-100">{alert.title}</h4>
        </div>
        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${style.badge}`}>
          {alert.severity}
        </span>
      </div>

      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{alert.description}</p>

      <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/50">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onSelectShipment?.(alert.shipmentId)}
            className="font-mono text-cyan-400 hover:underline flex items-center gap-0.5"
          >
            <span>{alert.shipmentCode}</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
          {alert.triggerValue && (
            <span className="font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              {alert.triggerValue}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-slate-400 font-mono">
          <Clock className="w-3 h-3" />
          <span>{new Date(alert.timestamp || alert.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
};
