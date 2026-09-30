import React, { useState } from 'react';
import { 
  Cpu, 
  ArrowDown, 
  Layers, 
  Database, 
  CheckCircle2, 
  Copy, 
  Check, 
  Code2,
  GitBranch,
  Terminal
} from 'lucide-react';
import { ARCHITECTURE_NODES, DATA_SCHEMAS_DOCS } from '../data/governanceData';

export const ArchitecturePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'schemas'>('pipeline');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('ARCH-01');
  const [selectedSchemaId, setSelectedSchemaId] = useState<string>('SCHEMA-01');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const selectedNode = ARCHITECTURE_NODES.find(n => n.id === selectedNodeId) || ARCHITECTURE_NODES[0];
  const selectedSchema = DATA_SCHEMAS_DOCS.find(s => s.id === selectedSchemaId) || DATA_SCHEMAS_DOCS[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
              Production Architecture & Schemas
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            System Architecture & Data Schema Specification
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Complete end-to-end data pipeline from physical sensor simulation and edge buffering to Bayesian reconstruction, workload safeguards, and executive reporting.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'pipeline'
                ? 'bg-cyan-600 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>10-Stage Pipeline</span>
          </button>
          <button
            onClick={() => setActiveTab('schemas')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'schemas'
                ? 'bg-cyan-600 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>12 Core Schemas</span>
          </button>
        </div>
      </div>

      {activeTab === 'pipeline' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Vertical Pipeline Flow (5 Cols) */}
          <div className="lg:col-span-5 glass-panel p-5 space-y-2">
            <h3 className="font-bold text-sm text-slate-200 flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-cyan-400" />
                Pipeline Execution Sequence
              </span>
              <span className="text-[10px] text-slate-400 font-mono">10 Steps Sequential</span>
            </h3>

            <div className="space-y-1.5 pt-2">
              {ARCHITECTURE_NODES.map((node, index) => {
                const isSelected = selectedNode.id === node.id;
                const isLast = index === ARCHITECTURE_NODES.length - 1;

                return (
                  <div key={node.id} className="relative">
                    <button
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-cyan-950/80 border-cyan-700 text-cyan-200 shadow-md shadow-cyan-950/40'
                          : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                          isSelected ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {node.stepNumber}
                        </span>
                        <div>
                          <p className="font-bold tracking-tight">{node.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{node.layer}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                        {node.id}
                      </span>
                    </button>

                    {!isLast && (
                      <div className="flex justify-center my-0.5">
                        <ArrowDown className="w-3.5 h-3.5 text-slate-600" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Node Inspector Details (7 Cols) */}
          <div className="lg:col-span-7 glass-panel p-6 space-y-5">
            <div className="border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2 py-0.5 rounded">
                  Step {selectedNode.stepNumber}: {selectedNode.id}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Layer: <span className="text-slate-200 font-bold">{selectedNode.layer}</span>
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-100 mt-2">
                {selectedNode.name}
              </h3>
              <p className="text-xs font-mono text-cyan-400 mt-1 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                {selectedNode.componentPath}
              </p>
            </div>

            {/* Inputs & Outputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                <span className="font-bold text-slate-300 flex items-center gap-1.5 text-[11px] mb-2 text-cyan-400">
                  <ArrowDown className="w-3.5 h-3.5 rotate-180" />
                  Direct Ingested Inputs
                </span>
                <ul className="space-y-1 text-slate-300">
                  {selectedNode.inputs.map((inp, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                      {inp}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                <span className="font-bold text-slate-300 flex items-center gap-1.5 text-[11px] mb-2 text-emerald-400">
                  <ArrowDown className="w-3.5 h-3.5" />
                  Downstream Emitted Outputs
                </span>
                <ul className="space-y-1 text-slate-300">
                  {selectedNode.outputs.map((out, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                      {out}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Core Responsibilities */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">
                Implemented Engine Responsibilities
              </span>
              <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800 space-y-2">
                {selectedNode.responsibilities.map((resp, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{resp}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Design Patterns & Architectural Styles */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">
                Applied Design Patterns & Algorithms
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedNode.designPatterns.map((pat, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px]">
                    {pat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Schemas Documentation Tab */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Schemas List (4 Cols) */}
          <div className="lg:col-span-4 glass-panel p-4 space-y-2">
            <h3 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                Data Schemas
              </span>
              <span className="text-[10px] text-slate-400 font-mono">12 Models</span>
            </h3>

            <div className="space-y-1 pt-1 max-h-[600px] overflow-y-auto pr-1">
              {DATA_SCHEMAS_DOCS.map((schema) => {
                const isSelected = selectedSchema.id === schema.id;

                return (
                  <button
                    key={schema.id}
                    onClick={() => setSelectedSchemaId(schema.id)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-950/80 border-cyan-700 text-cyan-200 font-bold'
                        : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span>{schema.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {schema.fields.length} fields
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schema Viewer (8 Cols) */}
          <div className="lg:col-span-8 glass-panel p-6 space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-cyan-400" />
                  {selectedSchema.name} Interface
                </h3>
                <button
                  onClick={() => handleCopy(selectedSchema.typeScriptDefinition)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-mono text-slate-300 flex items-center gap-1.5 border border-slate-700 transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy TS'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {selectedSchema.description}
              </p>
            </div>

            {/* TypeScript Code Block */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                TypeScript Definition
              </span>
              <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto">
                {selectedSchema.typeScriptDefinition}
              </pre>
            </div>

            {/* Field Descriptions Table */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Field Descriptions & Semantics
              </span>
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                    <tr>
                      <th className="p-2.5">Field Name</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Req</th>
                      <th className="p-2.5">Biological / Operational Meaning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                    {selectedSchema.fields.map((field, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/60">
                        <td className="p-2.5 font-mono text-cyan-400 font-bold">{field.name}</td>
                        <td className="p-2.5 font-mono text-slate-300">{field.type}</td>
                        <td className="p-2.5 font-mono text-[10px]">
                          {field.required ? (
                            <span className="text-rose-400 font-bold">YES</span>
                          ) : (
                            <span className="text-slate-500">OPT</span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-300">{field.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* JSON Example */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Real JSON Wire Payload Example
              </span>
              <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-amber-300 overflow-x-auto">
                {selectedSchema.jsonExample}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
