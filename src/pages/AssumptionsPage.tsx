import React, { useState } from 'react';
import { 
  FileText, 
  AlertOctagon, 
  Thermometer, 
  Wifi, 
  CheckCircle, 
  Truck, 
  CloudSun, 
  Users, 
  Cpu,
  Info
} from 'lucide-react';
import { ASSUMPTIONS_ITEMS, MANDATORY_ESTIMATE_DISCLAIMER } from '../data/governanceData';

export const AssumptionsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = [
    { key: 'All', label: 'All Assumptions', icon: FileText },
    { key: 'Sensor', label: 'Sensor', icon: Thermometer },
    { key: 'Network', label: 'Network', icon: Wifi },
    { key: 'Calibration', label: 'Calibration', icon: CheckCircle },
    { key: 'Journey', label: 'Journey', icon: Truck },
    { key: 'Environmental', label: 'Environmental', icon: CloudSun },
    { key: 'Worker Workload', label: 'Worker Workload', icon: Users },
    { key: 'Simulation', label: 'Simulation', icon: Cpu },
  ];

  const filteredItems = selectedCategory === 'All' 
    ? ASSUMPTIONS_ITEMS 
    : ASSUMPTIONS_ITEMS.filter(item => item.category === selectedCategory);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
              Thermodynamic & System Specification
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            System Operational & Thermal Modeling Assumptions
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Mathematical, environmental, hardware, and operational boundaries governing cold-chain telemetry gap reconstruction and confidence modeling.
          </p>
        </div>
      </div>

      {/* MANDATORY GOVERNING PRINCIPLE CALLOUT */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-2 border-amber-500/80 shadow-xl shadow-amber-950/30 flex items-start gap-4">
        <div className="p-3 rounded-lg bg-amber-500/20 text-amber-300 shrink-0 mt-0.5">
          <AlertOctagon className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div>
          <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-amber-400">
            Mandatory Regulatory System Rule
          </span>
          <h3 className="text-base sm:text-lg font-extrabold text-amber-100 mt-0.5 tracking-tight">
            "{MANDATORY_ESTIMATE_DISCLAIMER}"
          </h3>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            Under international food hygiene compliance frameworks (FDA FSMA 204, EU Regulation (EC) 853/2004, and Codex Alimentarius CXC 52-2003), algorithmically reconstructed temperatures represent mathematical approximations constrained by uncertainty bands. They must never be represented to regulatory inspectors or buyers as empirical direct sensor wire observations.
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Assumptions Cards Grid */}
      <div className="grid grid-cols-1 gap-5">
        {filteredItems.map((item) => (
          <div key={item.id} className="glass-panel p-5 space-y-4 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-900 px-2 py-0.5 rounded">
                  {item.id}
                </span>
                <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {item.category}
                </span>
                <h4 className="font-bold text-sm text-slate-100">
                  {item.title}
                </h4>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-200 uppercase tracking-wider text-[10px] text-cyan-400">
                  Assumption Statement
                </span>
                <p className="text-slate-200 font-medium mt-1 bg-slate-900/80 p-3 rounded border border-slate-800/80 leading-relaxed text-sm">
                  {item.statement}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="bg-slate-950/60 p-3 rounded border border-slate-800">
                  <span className="font-bold text-slate-300 flex items-center gap-1 text-[11px]">
                    <Info className="w-3.5 h-3.5 text-blue-400" />
                    Physical / Mathematical Basis
                  </span>
                  <p className="text-slate-400 mt-1.5 leading-relaxed font-mono text-[11px]">
                    {item.physicalBasis}
                  </p>
                </div>

                <div className="bg-slate-950/60 p-3 rounded border border-slate-800">
                  <span className="font-bold text-slate-300 flex items-center gap-1 text-[11px]">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    Boundary Conditions
                  </span>
                  <p className="text-slate-400 mt-1.5 leading-relaxed">
                    {item.boundaryConditions}
                  </p>
                </div>

                <div className="bg-slate-950/60 p-3 rounded border border-slate-800">
                  <span className="font-bold text-slate-300 flex items-center gap-1 text-[11px]">
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                    Failure Consequence
                  </span>
                  <p className="text-slate-400 mt-1.5 leading-relaxed">
                    {item.failureConsequence}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
