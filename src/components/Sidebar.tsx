import React from 'react';
import { 
  LayoutDashboard, 
  Ship, 
  Radio, 
  Activity, 
  Sparkles, 
  Bell, 
  SplitSquareVertical, 
  Users, 
  FlaskConical, 
  ShieldAlert, 
  FileText, 
  Cpu, 
  BookOpen,
  ThermometerSnowflake,
  Database
} from 'lucide-react';

export type PageKey = 
  | 'dashboard'
  | 'shipments'
  | 'shipment-detail'
  | 'sensors'
  | 'gap-analysis'
  | 'data-preview'
  | 'reconstruction'
  | 'alerts'
  | 'before-after'
  | 'workload'
  | 'experiments'
  | 'risk-register'
  | 'assumptions'
  | 'architecture'
  | 'user-guide';

interface SidebarProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  activeAlertsCount?: number;
  gapCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  activeAlertsCount = 2,
  gapCount = 4,
}) => {
  const navSections = [
    {
      title: 'Core Operations',
      items: [
        { key: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { key: 'shipments', label: 'Shipments', icon: Ship },
        { key: 'sensors', label: 'Sensors', icon: Radio },
        { key: 'gap-analysis', label: 'Gap Analysis', icon: Activity, badge: gapCount > 0 ? `${gapCount}` : undefined, badgeColor: 'bg-amber-900 text-amber-300' },
      ],
    },
    {
      title: 'Simulation & Reconstruction',
      items: [
        { key: 'data-preview', label: 'Data Preview & Simulator', icon: Database },
        { key: 'reconstruction', label: 'Reconstruction', icon: Sparkles },
        { key: 'before-after', label: 'Before vs After', icon: SplitSquareVertical },
        { key: 'experiments', label: 'Experiments', icon: FlaskConical },
      ],
    },
    {
      title: 'Risk & Monitoring',
      items: [
        { key: 'alerts', label: 'Alerts', icon: Bell, badge: activeAlertsCount > 0 ? `${activeAlertsCount}` : undefined, badgeColor: 'bg-rose-900 text-rose-300 animate-pulse' },
        { key: 'workload', label: 'Workload', icon: Users },
        { key: 'risk-register', label: 'Risk Register', icon: ShieldAlert },
      ],
    },
    {
      title: 'Documentation',
      items: [
        { key: 'assumptions', label: 'Assumptions', icon: FileText },
        { key: 'architecture', label: 'Architecture', icon: Cpu },
        { key: 'user-guide', label: 'User Guide', icon: BookOpen },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col h-screen sticky top-0 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-950/50">
          <ThermometerSnowflake className="w-6 h-6 text-slate-950 stroke-[2.2]" />
        </div>
        <div>
          <h1 className="font-bold text-base text-slate-100 tracking-tight flex items-center gap-1.5">
            ColdChain <span className="text-cyan-400 font-extrabold">Insight</span>
          </h1>
          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Seafood Exporter v1.0</p>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <h2 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {section.title}
            </h2>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.key || (currentPage === 'shipment-detail' && item.key === 'shipments');

              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key as PageKey)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* System Footer Status */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Reconstruction Engine
          </span>
          <span className="font-mono text-[10px] text-emerald-400 font-semibold">ONLINE</span>
        </div>
      </div>
    </aside>
  );
};
