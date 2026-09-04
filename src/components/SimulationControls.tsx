import React, { useState } from 'react';
import { SimulationConfig, SimulationSummary } from '../types';
import { DEFAULT_SIMULATION_CONFIG } from '../services/simulator/shipmentSimulator';
import { 
  Play, 
  RotateCcw, 
  Database, 
  CheckCircle2, 
  Sliders, 
  Radio, 
  Activity, 
  Ship, 
  FileText 
} from 'lucide-react';

interface SimulationControlsProps {
  config: SimulationConfig;
  summary: SimulationSummary;
  onGenerate: (newConfig: SimulationConfig) => void;
  onReset: () => void;
  onLoadDemo: () => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  config,
  summary,
  onGenerate,
  onReset,
  onLoadDemo,
}) => {
  const [formState, setFormState] = useState<SimulationConfig>(config);
  const [isGeneratedMsg, setIsGeneratedMsg] = useState<boolean>(true);

  const handleInputChange = (field: keyof SimulationConfig, value: number) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(formState);
    setIsGeneratedMsg(true);
  };

  const handleResetClick = () => {
    setFormState(DEFAULT_SIMULATION_CONFIG);
    onReset();
    setIsGeneratedMsg(true);
  };

  const handleDemoClick = () => {
    setFormState(DEFAULT_SIMULATION_CONFIG);
    onLoadDemo();
    setIsGeneratedMsg(true);
  };

  return (
    <div className="glass-panel p-5 space-y-6">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            Sensor Telemetry Simulation Controls
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure seedable PRNG parameters to generate reproducible sensor telemetry datasets with ground truth tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDemoClick}
            className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-800/80 rounded-lg text-xs font-semibold text-purple-300 transition-colors flex items-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5 text-purple-400" />
            <span>Load Demo Dataset (Seed 42)</span>
          </button>

          <button
            type="button"
            onClick={handleResetClick}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Main Parameters Form */}
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* PRNG Seed */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <label className="text-slate-300 font-medium block">
              PRNG Seed (Deterministic)
            </label>
            <input
              type="number"
              value={formState.seed}
              onChange={(e) => handleInputChange('seed', parseInt(e.target.value) || 42)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-cyan-400 font-bold focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[10px] text-slate-500">Fixed seed guarantees identical dataset reproduction.</p>
          </div>

          {/* Number of Shipments */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between">
              <label className="text-slate-300 font-medium">Number of Shipments</label>
              <span className="font-mono text-cyan-400 font-bold">{formState.numShipments}</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={formState.numShipments}
              onChange={(e) => handleInputChange('numShipments', parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">1 to 5 active export routes.</p>
          </div>

          {/* Number of Sensors per Shipment */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between">
              <label className="text-slate-300 font-medium">Sensors / Shipment</label>
              <span className="font-mono text-cyan-400 font-bold">{formState.numSensorsPerShipment}</span>
            </div>
            <input
              type="range"
              min="1"
              max="4"
              step="1"
              value={formState.numSensorsPerShipment}
              onChange={(e) => handleInputChange('numSensorsPerShipment', parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">IoT, BLE & Satellite node redundancy.</p>
          </div>

          {/* Ping Interval */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between">
              <label className="text-slate-300 font-medium">Ping Interval (mins)</label>
              <span className="font-mono text-cyan-400 font-bold">{formState.pingIntervalMinutes}m</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={formState.pingIntervalMinutes}
              onChange={(e) => handleInputChange('pingIntervalMinutes', parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Reading frequency every 1–15 mins.</p>
          </div>

          {/* Dropout Rate */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between">
              <label className="text-slate-300 font-medium">Dropout Probability</label>
              <span className="font-mono text-amber-400 font-bold">{Math.round(formState.dropoutProbability * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.01"
              value={formState.dropoutProbability}
              onChange={(e) => handleInputChange('dropoutProbability', parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Random missing reading frequency.</p>
          </div>

          {/* Noise Level */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between">
              <label className="text-slate-300 font-medium">Noise Level (Std Dev)</label>
              <span className="font-mono text-cyan-400 font-bold">{formState.noiseLevel.toFixed(2)} °C</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={formState.noiseLevel}
              onChange={(e) => handleInputChange('noiseLevel', parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Gaussian measurement noise.</p>
          </div>

          {/* Dead Sensor Probability */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between">
              <label className="text-slate-300 font-medium">Dead Sensor Rate</label>
              <span className="font-mono text-rose-400 font-bold">{Math.round(formState.deadSensorProbability * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.05"
              value={formState.deadSensorProbability}
              onChange={(e) => handleInputChange('deadSensorProbability', parseFloat(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Probability of complete leg blackout.</p>
          </div>

          {/* Calibration Drift */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between">
              <label className="text-slate-300 font-medium">Max Calibration Drift</label>
              <span className="font-mono text-purple-400 font-bold">±{formState.calibrationDriftMax.toFixed(1)} °C</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.1"
              value={formState.calibrationDriftMax}
              onChange={(e) => handleInputChange('calibrationDriftMax', parseFloat(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">Sensor bias offset deviation.</p>
          </div>
        </div>

        {/* Generate Action Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-950/50 transition-all flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Generate Dataset</span>
          </button>
        </div>
      </form>

      {/* Generated Dataset Status Banner */}
      {isGeneratedMsg && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Dataset generated successfully</span>
              <span className="font-mono text-[11px] text-slate-400">
                ({new Date(summary.generatedAt).toLocaleTimeString()})
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 font-mono text-emerald-400 font-bold text-xs">
              PRNG Seed: {summary.seed}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Number of Readings</span>
                <span className="font-mono font-bold text-slate-100">{summary.totalReadings.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Number of Gaps</span>
                <span className="font-mono font-bold text-amber-300">{summary.totalGaps}</span>
              </div>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
              <Radio className="w-4 h-4 text-purple-400" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Number of Sensors</span>
                <span className="font-mono font-bold text-purple-300">{summary.totalSensors}</span>
              </div>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
              <Ship className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Number of Shipments</span>
                <span className="font-mono font-bold text-emerald-300">{summary.totalShipments}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
