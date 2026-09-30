import React, { useState, useMemo } from 'react';
import { 
  Shipment, 
  Sensor, 
  SensorReading, 
  Gap, 
  AlertConfig 
} from '../types';
import { 
  DEFAULT_ALERT_CONFIG, 
  evaluateFleetAlerts, 
  calculateThresholdTradeoffs 
} from '../services/alerts/alertEngine';
import { AlertTable } from '../components/AlertTable';
import { TradeoffChart } from '../components/TradeoffChart';
import { KPICard } from '../components/KPICard';
import { 
  Bell, 
  Sliders, 
  ShieldAlert, 
  Sparkles, 
  AlertTriangle, 
  ShieldCheck, 
  RotateCcw, 
  Play, 
  Check, 
  SlidersHorizontal, 
  HelpCircle, 
  Thermometer, 
  Clock, 
  ShieldX,
  Target
} from 'lucide-react';

interface AlertsPageProps {
  shipments: Shipment[];
  sensors: Sensor[];
  readings: SensorReading[];
  gaps: Gap[];
  onSelectShipment?: (shipmentId: string) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({
  shipments,
  sensors,
  readings,
  gaps,
  onSelectShipment,
}) => {
  // Working draft configuration (before applying)
  const [draftConfig, setDraftConfig] = useState<AlertConfig>(DEFAULT_ALERT_CONFIG);
  
  // Active applied configuration
  const [activeConfig, setActiveConfig] = useState<AlertConfig>(DEFAULT_ALERT_CONFIG);

  // Status feedback
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState<boolean>(false);
  const [appliedFeedback, setAppliedFeedback] = useState<boolean>(false);

  // Preset definitions
  const PRESETS = [
    { label: 'Prompt Example (5°C / 20m / 75%)', temp: 5.0, duration: 20, conf: 75 },
    { label: 'Chilled Tuna (2°C / 20m / 75%)', temp: 2.0, duration: 20, conf: 75 },
    { label: 'Deep-Frozen Salmon (-18°C / 30m / 70%)', temp: -18.0, duration: 30, conf: 70 },
    { label: 'Live King Crab (6.5°C / 20m / 75%)', temp: 6.5, duration: 20, conf: 75 },
    { label: 'Strict Pharma (0.5°C / 10m / 85%)', temp: 0.5, duration: 10, conf: 85 },
  ];

  const handleUpdateDraft = (partial: Partial<AlertConfig>) => {
    setDraftConfig((prev) => ({ ...prev, ...partial }));
    setHasUnappliedChanges(true);
  };

  const handleApplyConfig = () => {
    setActiveConfig(draftConfig);
    setHasUnappliedChanges(false);
    setAppliedFeedback(true);
    setTimeout(() => setAppliedFeedback(false), 2000);
  };

  const handleResetDefaults = () => {
    setDraftConfig(DEFAULT_ALERT_CONFIG);
    setActiveConfig(DEFAULT_ALERT_CONFIG);
    setHasUnappliedChanges(false);
  };

  const handleApplyPreset = (temp: number, duration: number, conf: number) => {
    const newConfig: AlertConfig = {
      ...draftConfig,
      temperatureThreshold: temp,
      exposureDurationMinutes: duration,
      minConfidenceThreshold: conf,
    };
    setDraftConfig(newConfig);
    setActiveConfig(newConfig);
    setHasUnappliedChanges(false);
    setAppliedFeedback(true);
    setTimeout(() => setAppliedFeedback(false), 2000);
  };

  // Evaluate alerts dynamically using current activeConfig
  const generatedAlerts = useMemo(() => {
    return evaluateFleetAlerts(readings, gaps, shipments, sensors, activeConfig);
  }, [readings, gaps, shipments, sensors, activeConfig]);

  // Calculate Threshold Tradeoffs against Ground Truth
  const tradeoffPoints = useMemo(() => {
    return calculateThresholdTradeoffs(readings, gaps, shipments, sensors, activeConfig);
  }, [readings, gaps, shipments, sensors, activeConfig]);

  // Aggregate Dashboard Metrics
  const totalAlertsCount = generatedAlerts.length;
  const confirmedExposuresCount = generatedAlerts.filter(a => a.status === 'CONFIRMED_EXPOSURE').length;
  const possibleExposuresCount = generatedAlerts.filter(a => a.status === 'POSSIBLE_EXPOSURE').length;
  const lowConfidenceCount = generatedAlerts.filter(a => a.status === 'LOW_CONFIDENCE_ANOMALY').length;
  const falseAlarmCandidatesCount = generatedAlerts.filter(a => a.isFalseAlarmCandidate || a.status === 'LOW_CONFIDENCE_ANOMALY').length;

  // Find tradeoff metrics at current active threshold
  const currentTradeoff = tradeoffPoints.find(p => Math.abs(p.threshold - activeConfig.temperatureThreshold) < 0.25) || tradeoffPoints[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass-panel p-5 bg-gradient-to-r from-rose-950/40 via-purple-950/20 to-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
              ALERT ENGINE
            </span>
            <span className="text-xs font-mono text-cyan-400 font-semibold">
              Project Completion: 47%
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mt-1">
            <Bell className="w-5 h-5 text-rose-400" />
            Alert Threshold Tuning & Confidence-Aware Alerts
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Multi-factor exposure engine evaluating thermal excursions against exposure duration, direct observations vs reconstructed gaps, 
            uncertainty boundaries, and sensor reliability. Prevents false alarms on unverified sensor dropouts.
          </p>
        </div>

        {/* Scope Selector */}
        <div className="flex items-center gap-2 text-xs shrink-0">
          <span className="text-slate-400 font-medium">Evaluation Scope:</span>
          <select
            value={draftConfig.shipmentId || 'all'}
            onChange={(e) => {
              const sId = e.target.value;
              handleUpdateDraft({ shipmentId: sId });
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-600"
          >
            <option value="all">All Fleet Shipments ({shipments.length})</option>
            {shipments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} ({s.product.split(' ')[0]})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alert Configuration & Tuning Console */}
      <div className="glass-panel p-5 space-y-5 border border-cyan-900/40 bg-slate-900/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-slate-100">
              Alert Engine Configuration & Tuning Console
            </h3>
            {hasUnappliedChanges && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
                Unapplied Changes
              </span>
            )}
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500 font-mono mr-1">Presets:</span>
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleApplyPreset(p.temp, p.duration, p.conf)}
                className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-[10px] font-mono text-slate-300 hover:text-cyan-300 border border-slate-800 transition-colors"
              >
                {p.label.split(' (')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Interactive Sliders / Numeric Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
          {/* 1. Temperature Threshold */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-rose-400" />
                1. Temperature Threshold
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.5"
                  value={draftConfig.temperatureThreshold}
                  onChange={(e) => handleUpdateDraft({ temperatureThreshold: parseFloat(e.target.value) || 0 })}
                  className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono font-bold text-rose-400 text-xs focus:outline-none focus:border-rose-500"
                />
                <span className="text-xs text-slate-400 font-mono">°C</span>
              </div>
            </div>

            <input
              type="range"
              min="-25"
              max="15"
              step="0.5"
              value={draftConfig.temperatureThreshold}
              onChange={(e) => handleUpdateDraft({ temperatureThreshold: parseFloat(e.target.value) })}
              className="w-full accent-rose-500 cursor-pointer"
            />

            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>-25°C (Frozen)</span>
              <span>0°C</span>
              <span>+15°C (Warm)</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Thermal breach triggers when temperature equals or exceeds this boundary.
            </p>
          </div>

          {/* 2. Exposure Duration */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                2. Exposure Duration
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="5"
                  min="5"
                  max="120"
                  value={draftConfig.exposureDurationMinutes}
                  onChange={(e) => handleUpdateDraft({ exposureDurationMinutes: parseInt(e.target.value) || 5 })}
                  className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono font-bold text-amber-400 text-xs focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-slate-400 font-mono">min</span>
              </div>
            </div>

            <input
              type="range"
              min="5"
              max="120"
              step="5"
              value={draftConfig.exposureDurationMinutes}
              onChange={(e) => handleUpdateDraft({ exposureDurationMinutes: parseInt(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />

            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>5 min (Immediate)</span>
              <span>20 min (Default)</span>
              <span>120 min (Long)</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Short thermal spikes below this duration evaluate to NO_ALERT to avoid false alarms.
            </p>
          </div>

          {/* 3. Minimum Confidence Threshold */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                3. Minimum Confidence Threshold
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="5"
                  min="40"
                  max="95"
                  value={draftConfig.minConfidenceThreshold}
                  onChange={(e) => handleUpdateDraft({ minConfidenceThreshold: parseInt(e.target.value) || 50 })}
                  className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono font-bold text-cyan-400 text-xs focus:outline-none focus:border-cyan-500"
                />
                <span className="text-xs text-slate-400 font-mono">%</span>
              </div>
            </div>

            <input
              type="range"
              min="40"
              max="95"
              step="5"
              value={draftConfig.minConfidenceThreshold}
              onChange={(e) => handleUpdateDraft({ minConfidenceThreshold: parseInt(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />

            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>40% (Permissive)</span>
              <span>75% (Balanced)</span>
              <span>95% (Strict)</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Reconstructed breaches below this confidence are labeled LOW_CONFIDENCE_ANOMALY.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Current Active:</span>
            <span className="font-mono text-rose-300 font-bold">{activeConfig.temperatureThreshold}°C</span>
            <span className="text-slate-600">•</span>
            <span className="font-mono text-amber-300 font-bold">{activeConfig.exposureDurationMinutes}m</span>
            <span className="text-slate-600">•</span>
            <span className="font-mono text-cyan-300 font-bold">{activeConfig.minConfidenceThreshold}% Conf</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleResetDefaults}
              className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              onClick={handleApplyConfig}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg ${
                appliedFeedback
                  ? 'bg-emerald-600 text-white shadow-emerald-950/50'
                  : hasUnappliedChanges
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-cyan-950/50 hover:brightness-110'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {appliedFeedback ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Configuration Applied!</span>
                </>
              ) : (
                <>
                  <Sliders className="w-4 h-4" />
                  <span>Apply Configuration</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                handleApplyConfig();
              }}
              className="px-4 py-2 bg-purple-950/80 hover:bg-purple-900 border border-purple-800 text-purple-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run Simulation</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Alerts"
          value={totalAlertsCount}
          subtitle="All detected excursion events"
          icon={Bell}
          variant="purple"
        />
        <KPICard
          title="Confirmed Exposure"
          value={confirmedExposuresCount}
          subtitle="Direct NIST sensor breaches"
          icon={ShieldAlert}
          variant="rose"
        />
        <KPICard
          title="Possible Exposure"
          value={possibleExposuresCount}
          subtitle={`High confidence (≥${activeConfig.minConfidenceThreshold}%)`}
          icon={Sparkles}
          variant="cyan"
        />
        <KPICard
          title="Low Confidence"
          value={lowConfidenceCount}
          subtitle="Suppressed blackout anomalies"
          icon={AlertTriangle}
          variant="amber"
        />
        <KPICard
          title="False Alarm Candidates"
          value={falseAlarmCandidatesCount}
          subtitle="Saved from container rejection"
          icon={ShieldCheck}
          variant="emerald"
        />
      </div>

      {/* Threshold Tradeoff Simulation Panel */}
      <div className="space-y-4">
        {/* Tradeoff Summary Callout */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="glass-panel p-3.5 border-l-4 border-l-rose-500">
            <span className="text-[10px] text-slate-400 uppercase font-sans font-semibold block">False Positives (FP)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-rose-400">{currentTradeoff?.falsePositives ?? 0}</span>
              <span className="text-xs text-rose-300 font-sans">({currentTradeoff?.falsePositiveRate ?? 0}% Rate)</span>
            </div>
            <span className="text-[10px] text-slate-500 font-sans block mt-0.5">Spurious false alarms on safe cargo</span>
          </div>

          <div className="glass-panel p-3.5 border-l-4 border-l-amber-500">
            <span className="text-[10px] text-slate-400 uppercase font-sans font-semibold block">False Negatives (FN)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-amber-400">{currentTradeoff?.falseNegatives ?? 0}</span>
              <span className="text-xs text-amber-300 font-sans">({currentTradeoff?.falseNegativeRate ?? 0}% Rate)</span>
            </div>
            <span className="text-[10px] text-slate-500 font-sans block mt-0.5">Undetected real spoilage breaches</span>
          </div>

          <div className="glass-panel p-3.5 border-l-4 border-l-purple-500">
            <span className="text-[10px] text-slate-400 uppercase font-sans font-semibold block">Confirmed Exposures</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-rose-300">{currentTradeoff?.confirmedExposures ?? 0}</span>
              <span className="text-xs text-slate-400 font-sans">events</span>
            </div>
            <span className="text-[10px] text-slate-500 font-sans block mt-0.5">Immediate carrier claim eligible</span>
          </div>

          <div className="glass-panel p-3.5 border-l-4 border-l-cyan-500">
            <span className="text-[10px] text-slate-400 uppercase font-sans font-semibold block">Possible Exposures</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-purple-300">{currentTradeoff?.possibleExposures ?? 0}</span>
              <span className="text-xs text-slate-400 font-sans">events</span>
            </div>
            <span className="text-[10px] text-slate-500 font-sans block mt-0.5">Arrival inspection quarantine</span>
          </div>
        </div>

        {/* Dynamic Tradeoff Chart */}
        <TradeoffChart
          data={tradeoffPoints}
          currentThreshold={activeConfig.temperatureThreshold}
          onSelectThreshold={(t) => {
            handleUpdateDraft({ temperatureThreshold: t });
            setActiveConfig(prev => ({ ...prev, temperatureThreshold: t }));
          }}
        />
      </div>

      {/* Alert Classification Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <Target className="w-4 h-4 text-rose-400" />
              Active Cold-Chain Exposure Alerts & Anomaly Register
            </h3>
            <p className="text-xs text-slate-400">
              Evaluated across active transport legs considering continuous duration, confidence bounds, and sensor health.
            </p>
          </div>
        </div>

        <AlertTable
          alerts={generatedAlerts}
          onSelectShipment={onSelectShipment}
        />
      </div>

      {/* Engineering Architecture & Philosophy Banner */}
      <div className="glass-panel p-5 bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 border border-slate-800 space-y-3">
        <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          Why Confidence-Aware Alerts Matter for Seafood Exporters
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 pt-1">
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-rose-900/30 space-y-1.5">
            <span className="font-bold text-rose-400 flex items-center gap-1.5">
              <ShieldX className="w-4 h-4 text-rose-400" />
              The Naive Industry Approach: Temperature &gt; X = Alert
            </span>
            <p className="text-slate-400 leading-relaxed">
              Standard IoT telematics trigger alerts whenever raw readings exceed a threshold. During cellular dropouts or metal tarmac shadowing, 
              missing readings or noisy spikes trigger immediate alarms, leading to hundreds of false container rejections, unnecessary laboratory testing, 
              and millions in disputed cargo insurance claims.
            </p>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-cyan-900/30 space-y-1.5">
            <span className="font-bold text-cyan-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              ColdChain Insight: Multi-Factor Confidence-Aware Engine
            </span>
            <p className="text-slate-400 leading-relaxed">
              Our confidence-aware alert engine factors in <strong>sustained exposure duration</strong>, differentiates <strong>direct sensor observations</strong> from 
              <strong>reconstructed estimates</strong>, verifies <strong>NIST calibration & battery health</strong>, and requires high confidence before 
              escalation. Unverifiable blackouts are categorized as <span className="font-mono text-amber-300">LOW_CONFIDENCE_ANOMALY</span> for arrival dock audits, 
              protecting cargo integrity without false alarms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
