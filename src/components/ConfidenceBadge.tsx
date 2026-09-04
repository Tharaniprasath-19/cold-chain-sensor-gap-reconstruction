import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

interface ConfidenceBadgeProps {
  score: number; // 0 to 100
  showBar?: boolean;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ score, showBar = false }) => {
  const getConfidenceLevel = (val: number) => {
    if (val >= 90) {
      return {
        label: 'High Confidence',
        textColor: 'text-emerald-400',
        bgColor: 'bg-emerald-950/50 border-emerald-800/40',
        barColor: 'bg-emerald-500',
        icon: ShieldCheck,
      };
    } else if (val >= 75) {
      return {
        label: 'Moderate Confidence',
        textColor: 'text-cyan-400',
        bgColor: 'bg-cyan-950/50 border-cyan-800/40',
        barColor: 'bg-cyan-500',
        icon: ShieldCheck,
      };
    } else if (val >= 60) {
      return {
        label: 'Low Confidence',
        textColor: 'text-amber-400',
        bgColor: 'bg-amber-950/50 border-amber-800/40',
        barColor: 'bg-amber-500',
        icon: ShieldAlert,
      };
    } else {
      return {
        label: 'Unreliable',
        textColor: 'text-rose-400',
        bgColor: 'bg-rose-950/50 border-rose-800/40',
        barColor: 'bg-rose-500',
        icon: ShieldX,
      };
    }
  };

  const level = getConfidenceLevel(score);
  const Icon = level.icon;

  return (
    <div className="flex flex-col gap-1 inline-block">
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${level.bgColor}`}>
        <Icon className={`w-3.5 h-3.5 ${level.textColor}`} />
        <span className={`font-mono font-semibold text-xs ${level.textColor}`}>
          {score.toFixed(1)}%
        </span>
      </div>
      {showBar && (
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${level.barColor}`}
            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          />
        </div>
      )}
    </div>
  );
};
