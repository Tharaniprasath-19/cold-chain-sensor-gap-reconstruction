import React from 'react';
import { HandoverEvent } from '../types';
import { CheckCircle2, AlertTriangle, Clock, MapPin, UserCheck } from 'lucide-react';

interface TimelineProps {
  events: HandoverEvent[];
}

export const Timeline: React.FC<TimelineProps> = ({ events }) => {
  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
      {events.map((evt) => (
        <div key={evt.id} className="relative group">
          {/* Node Circle */}
          <div 
            className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-slate-950 ${
              evt.checkPassed 
                ? 'border-emerald-500 text-emerald-400' 
                : 'border-amber-500 text-amber-400'
            }`}
          >
            {evt.checkPassed ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <AlertTriangle className="w-3 h-3" />
            )}
          </div>

          <div className="glass-panel p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-slate-200">{evt.legFrom}</span>
                <span className="text-slate-500">→</span>
                <span className="font-semibold text-xs text-cyan-400">{evt.legTo}</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                {new Date(evt.timestamp).toLocaleString()}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>{evt.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-slate-400" />
                <span className="text-slate-400">{evt.handlerFrom} → <strong className="text-slate-200">{evt.handlerTo}</strong></span>
              </div>
              <div className="font-mono text-[11px] text-slate-400">
                Duration: {evt.durationMinutes} mins | Ambient: {evt.ambientTemp}°C
              </div>
            </div>

            {evt.notes && (
              <p className="text-xs text-amber-300/90 bg-amber-950/40 p-2 rounded border border-amber-800/40">
                ⚠️ {evt.notes}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
