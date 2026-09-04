import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNegative?: boolean;
  };
  icon: LucideIcon;
  variant?: 'blue' | 'purple' | 'amber' | 'emerald' | 'rose' | 'cyan';
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  variant = 'cyan',
  onClick,
}) => {
  const variantStyles = {
    cyan: {
      border: 'hover:border-cyan-500/50',
      iconBg: 'bg-cyan-950/80 text-cyan-400 border-cyan-800/50',
      accent: 'text-cyan-400',
    },
    blue: {
      border: 'hover:border-sky-500/50',
      iconBg: 'bg-sky-950/80 text-sky-400 border-sky-800/50',
      accent: 'text-sky-400',
    },
    purple: {
      border: 'hover:border-purple-500/50',
      iconBg: 'bg-purple-950/80 text-purple-400 border-purple-800/50',
      accent: 'text-purple-400',
    },
    amber: {
      border: 'hover:border-amber-500/50',
      iconBg: 'bg-amber-950/80 text-amber-400 border-amber-800/50',
      accent: 'text-amber-400',
    },
    emerald: {
      border: 'hover:border-emerald-500/50',
      iconBg: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50',
      accent: 'text-emerald-400',
    },
    rose: {
      border: 'hover:border-rose-500/50',
      iconBg: 'bg-rose-950/80 text-rose-400 border-rose-800/50',
      accent: 'text-rose-400',
    },
  };

  const style = variantStyles[variant];

  return (
    <div 
      onClick={onClick}
      className={`glass-panel p-5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${style.border}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold font-mono text-slate-100 mt-1">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-lg border ${style.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        {subtitle && <span className="text-slate-400">{subtitle}</span>}
        {trend && (
          <span 
            className={`font-medium ${
              trend.isPositive ? 'text-emerald-400' : trend.isNegative ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
};
