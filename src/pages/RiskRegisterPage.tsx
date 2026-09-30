import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  UserCheck, 
  BookOpen, 
  ChevronDown,
  ChevronUp,
  Download
} from 'lucide-react';
import { RISK_REGISTER_ITEMS } from '../data/governanceData';
import { RiskImpact, RiskLikelihood, ResidualRisk } from '../types';

export const RiskRegisterPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedImpact, setSelectedImpact] = useState<string>('All');
  const [expandedRiskId, setExpandedRiskId] = useState<string | null>('RSK-001');

  // Filtered risks
  const filteredRisks = useMemo(() => {
    return RISK_REGISTER_ITEMS.filter((item) => {
      const matchesSearch = 
        item.risk.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.mitigation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesImpact = selectedImpact === 'All' || item.impact === selectedImpact;

      return matchesSearch && matchesCategory && matchesImpact;
    });
  }, [searchQuery, selectedCategory, selectedImpact]);

  // Summary Metrics
  const totalRisks = RISK_REGISTER_ITEMS.length;
  const criticalImpactCount = RISK_REGISTER_ITEMS.filter(r => r.impact === 'Critical').length;
  const highImpactCount = RISK_REGISTER_ITEMS.filter(r => r.impact === 'High').length;
  const lowResidualRiskCount = RISK_REGISTER_ITEMS.filter(r => r.residualRisk === 'Low').length;
  const residualRiskControlledPercent = ((lowResidualRiskCount / totalRisks) * 100).toFixed(0);

  const getImpactBadge = (impact: RiskImpact) => {
    switch (impact) {
      case 'Critical':
        return 'bg-rose-950/80 text-rose-300 border-rose-800';
      case 'High':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'Medium':
        return 'bg-yellow-950/80 text-yellow-300 border-yellow-800';
      case 'Low':
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getLikelihoodBadge = (likelihood: RiskLikelihood) => {
    switch (likelihood) {
      case 'High':
        return 'text-rose-400';
      case 'Medium':
        return 'text-amber-400';
      case 'Low':
        return 'text-emerald-400';
    }
  };

  const getResidualRiskBadge = (residual: ResidualRisk) => {
    switch (residual) {
      case 'High':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'Medium':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'Low':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(RISK_REGISTER_ITEMS, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `coldchain-risk-register-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span className="text-xs font-mono uppercase tracking-wider text-rose-400 font-bold">
              Enterprise Risk Governance
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Cold-Chain Sensor-Gap Risk Register
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Systemic risk assessment across algorithmic reconstruction, hardware telemetry, edge network buffering, and frontline human factors for export consignments.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleExportJSON}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export Risk Register</span>
          </button>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Evaluated Risks</p>
            <p className="text-2xl font-bold text-slate-100 mt-0.5">{totalRisks}</p>
            <p className="text-[11px] text-cyan-400 mt-0.5">12 Systemic Categories</p>
          </div>
          <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-800 text-cyan-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Critical Impact Risks</p>
            <p className="text-2xl font-bold text-rose-400 mt-0.5">{criticalImpactCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Over-reliance & Buffer Loss</p>
          </div>
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">High Impact Risks</p>
            <p className="text-2xl font-bold text-amber-400 mt-0.5">{highImpactCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Blackouts, Drift & Overload</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Controlled Residual Risk</p>
            <p className="text-2xl font-bold text-emerald-400 mt-0.5">{residualRiskControlledPercent}%</p>
            <p className="text-[11px] text-emerald-400 mt-0.5">{lowResidualRiskCount} of {totalRisks} Reduced to Low</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 5x3 Risk Heatmap Matrix */}
      <div className="glass-panel p-5 space-y-3">
        <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
          <span>Likelihood vs Impact Risk Distribution Matrix</span>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded">
            Pre-Mitigation Inherent Risk
          </span>
        </h3>
        
        <div className="grid grid-cols-4 gap-2 pt-2 text-xs">
          <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 text-slate-400 font-mono text-[11px] font-bold">
            Likelihood \ Impact
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 text-center font-bold text-yellow-400">
            Medium
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 text-center font-bold text-amber-400">
            High
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 text-center font-bold text-rose-400">
            Critical
          </div>

          {/* High Likelihood Row */}
          <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 font-bold text-rose-400">
            High Likelihood
          </div>
          <div className="bg-yellow-950/30 p-2.5 rounded border border-yellow-800/40 text-center">
            <span className="font-bold text-yellow-300">2 Risks</span>
            <p className="text-[10px] text-slate-400 mt-0.5">Drift (RSK-03), Fatigue (RSK-07)</p>
          </div>
          <div className="bg-amber-950/40 p-2.5 rounded border border-amber-800/60 text-center">
            <span className="font-bold text-amber-300">3 Risks</span>
            <p className="text-[10px] text-slate-400 mt-0.5">Long Gaps (04), Alerts (06), Overload (08)</p>
          </div>
          <div className="bg-rose-950/40 p-2.5 rounded border border-rose-800/60 text-center text-slate-500">
            —
          </div>

          {/* Medium Likelihood Row */}
          <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 font-bold text-amber-400">
            Medium Likelihood
          </div>
          <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800/60 text-center">
            <span className="font-bold text-slate-300">3 Risks</span>
            <p className="text-[10px] text-slate-400 mt-0.5">Conflict (05), Route (09), Clock (11)</p>
          </div>
          <div className="bg-amber-950/30 p-2.5 rounded border border-amber-800/40 text-center">
            <span className="font-bold text-amber-300">1 Risk</span>
            <p className="text-[10px] text-slate-400 mt-0.5">Simulation Limits (RSK-12)</p>
          </div>
          <div className="bg-rose-950/40 p-2.5 rounded border border-rose-800/60 text-center">
            <span className="font-bold text-rose-300">1 Risk</span>
            <p className="text-[10px] text-slate-400 mt-0.5">Over-Reliance (RSK-01)</p>
          </div>

          {/* Low Likelihood Row */}
          <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 font-bold text-emerald-400">
            Low Likelihood
          </div>
          <div className="bg-slate-900/20 p-2.5 rounded border border-slate-800/40 text-center text-slate-500">
            —
          </div>
          <div className="bg-yellow-950/20 p-2.5 rounded border border-yellow-800/40 text-center">
            <span className="font-bold text-slate-300">1 Risk</span>
            <p className="text-[10px] text-slate-400 mt-0.5">Sensor Spoofing (RSK-02)</p>
          </div>
          <div className="bg-rose-950/40 p-2.5 rounded border border-rose-800/60 text-center">
            <span className="font-bold text-rose-300">1 Risk</span>
            <p className="text-[10px] text-slate-400 mt-0.5">Buffer Failure (RSK-10)</p>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search risk, mitigation, or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="All">All Categories</option>
              <option value="Algorithmic">Algorithmic</option>
              <option value="Hardware">Hardware</option>
              <option value="Operational">Operational</option>
              <option value="Data Integrity">Data Integrity</option>
              <option value="Environmental">Environmental</option>
              <option value="Simulation">Simulation</option>
            </select>
          </div>

          <select
            value={selectedImpact}
            onChange={(e) => setSelectedImpact(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="All">All Impacts</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
          </select>
        </div>
      </div>

      {/* Risk Items List / Table */}
      <div className="space-y-3">
        {filteredRisks.map((item) => {
          const isExpanded = expandedRiskId === item.id;

          return (
            <div 
              key={item.id}
              className={`glass-panel border transition-all duration-150 overflow-hidden ${
                isExpanded ? 'border-cyan-800/80 bg-slate-900/90' : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
              }`}
            >
              <div 
                onClick={() => setExpandedRiskId(isExpanded ? null : item.id)}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-start md:items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded">
                    {item.id}
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      {item.risk}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Category: <span className="text-slate-300 font-medium">{item.category}</span> • Owner: <span className="text-cyan-400">{item.owner}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                  <span className="text-xs">
                    Likelihood: <span className={`font-semibold ${getLikelihoodBadge(item.likelihood)}`}>{item.likelihood}</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getImpactBadge(item.impact)}`}>
                    {item.impact} Impact
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getResidualRiskBadge(item.residualRisk)}`}>
                    Residual: {item.residualRisk}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 ml-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
                  )}
                </div>
              </div>

              {/* Expanded Detailed Breakdown */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-950/40">
                  <div className="space-y-3">
                    <div>
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                        Engineered Mitigation Strategy
                      </span>
                      <p className="text-slate-300 mt-1 leading-relaxed bg-slate-900/80 p-3 rounded border border-slate-800">
                        {item.mitigation}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-amber-400" />
                        Automated Detection Method
                      </span>
                      <p className="text-slate-400 mt-1 bg-slate-900/80 p-3 rounded border border-slate-800">
                        {item.detectionMethod}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Accountable Owner & Governance
                      </span>
                      <div className="mt-1 bg-slate-900/80 p-3 rounded border border-slate-800 space-y-1">
                        <p className="text-slate-200 font-semibold">{item.owner}</p>
                        <p className="text-slate-400 text-[11px]">Primary Operational Signoff Authority</p>
                      </div>
                    </div>

                    {item.regulatoryStandard && (
                      <div>
                        <span className="font-bold text-slate-300 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                          Referenced Regulatory Standard
                        </span>
                        <div className="mt-1 bg-slate-900/80 p-3 rounded border border-slate-800">
                          <span className="font-mono text-purple-300 font-medium">
                            {item.regulatoryStandard}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredRisks.length === 0 && (
          <div className="glass-panel p-8 text-center text-slate-400 text-xs">
            No risks match the query "{searchQuery}".
          </div>
        )}
      </div>
    </div>
  );
};
