import React from 'react';
import { StatusCategory } from '../types';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
  Eye, 
  HelpCircle 
} from 'lucide-react';

interface StatusBadgeProps {
  status: StatusCategory | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'md',
  showIcon = true 
}) => {
  const getBadgeStyle = (stat: string) => {
    switch (stat) {
      case 'Healthy':
        return {
          bg: 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400',
          dot: 'bg-emerald-400',
          icon: CheckCircle2,
        };
      case 'Observed':
        return {
          bg: 'bg-sky-950/60 border-sky-800/60 text-sky-400',
          dot: 'bg-sky-400',
          icon: Eye,
        };
      case 'Reconstructed':
        return {
          bg: 'bg-purple-950/60 border-purple-800/60 text-purple-400',
          dot: 'bg-purple-400 animate-pulse',
          icon: Sparkles,
        };
      case 'Warning':
        return {
          bg: 'bg-amber-950/60 border-amber-800/60 text-amber-400',
          dot: 'bg-amber-400',
          icon: AlertTriangle,
        };
      case 'Critical':
        return {
          bg: 'bg-rose-950/60 border-rose-800/60 text-rose-400',
          dot: 'bg-rose-400 animate-ping',
          icon: XCircle,
        };
      case 'Unknown':
      default:
        return {
          bg: 'bg-slate-800/60 border-slate-700/60 text-slate-400',
          dot: 'bg-slate-400',
          icon: HelpCircle,
        };
    }
  };

  const style = getBadgeStyle(status);
  const IconComponent = style.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs font-medium gap-1.5',
    lg: 'px-3 py-1.5 text-sm font-medium gap-2',
  };

  return (
    <span 
      className={`inline-flex items-center rounded-full border transition-colors ${style.bg} ${sizeClasses[size]}`}
    >
      {showIcon && (
        <IconComponent className={`w-3.5 h-3.5 ${style.dot}`} />
      )}
      <span>{status}</span>
    </span>
  );
};
