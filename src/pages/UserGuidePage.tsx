import React, { useState } from 'react';
import { 
  BookOpen, 
  ShieldCheck, 
  UserCheck, 
  Lightbulb, 
  ArrowRight, 
  Search
} from 'lucide-react';
import { USER_GUIDE_SECTIONS } from '../data/governanceData';
import { PageKey } from '../components/Sidebar';

interface UserGuidePageProps {
  onNavigate?: (page: PageKey) => void;
}

export const UserGuidePage: React.FC<UserGuidePageProps> = ({ onNavigate }) => {
  const [activeRole, setActiveRole] = useState<'QA Officer' | 'Supervisor'>('QA Officer');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStep, setExpandedStep] = useState<number>(1);

  const activeSection = USER_GUIDE_SECTIONS.find(s => s.targetRole === activeRole) || USER_GUIDE_SECTIONS[0];

  const filteredSteps = activeSection.steps.filter(step => 
    step.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    step.instruction.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (step.tip && step.tip.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 bg-gradient-to-r from-slate-900 via-blue-950/20 to-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <span className="text-xs font-mono uppercase tracking-wider text-blue-400 font-bold">
              Standard Operating Procedures Manual
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            ColdChain Insight In-App User Guide
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Standard operating procedures for Quality Assurance officers, logistics dispatch operators, and quality supervisors monitoring export shipments.
          </p>
        </div>

        {/* Role Toggle */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800 shrink-0">
          <button
            onClick={() => { setActiveRole('QA Officer'); setExpandedStep(1); }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-2 ${
              activeRole === 'QA Officer'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>QA & Logistics (10 Steps)</span>
          </button>
          <button
            onClick={() => { setActiveRole('Supervisor'); setExpandedStep(1); }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-2 ${
              activeRole === 'Supervisor'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Supervisor Protocol</span>
          </button>
        </div>
      </div>

      {/* Role Intro Box */}
      <div className="glass-panel p-5 border border-slate-800 flex items-start gap-4">
        <div className={`p-3 rounded-xl shrink-0 ${activeRole === 'QA Officer' ? 'bg-blue-950 text-blue-400 border border-blue-800' : 'bg-purple-950 text-purple-400 border border-purple-800'}`}>
          {activeRole === 'QA Officer' ? <ShieldCheck className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
        </div>
        <div>
          <h3 className="font-bold text-base text-slate-100">
            {activeSection.title}
          </h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {activeSection.description}
          </p>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="glass-panel p-3.5 flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search procedure steps or pro-tips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
          Showing {filteredSteps.length} of {activeSection.steps.length} Steps
        </span>
      </div>

      {/* Step by Step Accordion & Guide */}
      <div className="space-y-3">
        {filteredSteps.map((step) => {
          const isExpanded = expandedStep === step.stepNumber;

          return (
            <div 
              key={step.stepNumber}
              className={`glass-panel border transition-all duration-150 overflow-hidden ${
                isExpanded ? 'border-blue-700 bg-slate-900/90' : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
              }`}
            >
              <div 
                onClick={() => setExpandedStep(isExpanded ? 0 : step.stepNumber)}
                className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3.5">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                    isExpanded 
                      ? 'bg-blue-500 text-slate-950' 
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {step.stepNumber}
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-slate-100">
                      Step {step.stepNumber}: {step.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded hidden sm:inline">
                    {activeRole === 'QA Officer' ? 'Standard SOP' : 'Supervisor Authority'}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 space-y-4 text-xs bg-slate-950/40">
                  <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 leading-relaxed text-slate-200 text-sm">
                    {step.instruction}
                  </div>

                  {step.tip && (
                    <div className="flex items-start gap-2.5 bg-blue-950/30 p-3 rounded-lg border border-blue-900/40 text-blue-200">
                      <Lightbulb className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[11px] text-blue-300 uppercase tracking-wider block">
                          Operational Pro-Tip
                        </span>
                        <p className="mt-0.5 text-xs text-slate-300">{step.tip}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Action Navigation Footer */}
      {onNavigate && (
        <div className="glass-panel p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
          <div>
            <h4 className="font-bold text-sm text-slate-200">Ready to put into practice?</h4>
            <p className="text-xs text-slate-400 mt-0.5">Jump directly to interactive fleet monitoring or algorithm validation.</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
            >
              Executive Dashboard
            </button>
            <button
              onClick={() => onNavigate('before-after')}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-semibold text-slate-950 transition-colors flex items-center gap-1.5"
            >
              <span>Before vs After</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
