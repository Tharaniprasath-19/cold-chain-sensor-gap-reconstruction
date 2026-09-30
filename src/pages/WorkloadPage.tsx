import React, { useState } from 'react';
import {
  Users,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  Anchor,
  Package,
  ShieldCheck,
  ArrowRight,
  Filter,
  Search,
  Sparkles,
  RotateCcw,
  UserCheck,
  AlertOctagon,
  FileCheck2,
  Layers,
  Inbox,
  ArrowUpRight
} from 'lucide-react';
import type {
  Worker,
  WorkloadStatus,
  WorkloadTask,
  TaskType,
  AssignmentAuditRecord,
  Alert,
  Shipment
} from '../types';
import {
  calculateWorkloadPercentage,
  assignTask,
  evaluateAlertToWorkload,
  calculateWorkloadMetrics,
  UNCERTAINTY_WORKLOAD_SAFEGUARD_RULE,
  initialMockTasks
} from '../services/workload/workloadEngine';
import { mockWorkers as baseMockWorkers } from '../data/mockData';

interface WorkloadPageProps {
  liveAlerts?: Alert[];
  shipments?: Shipment[];
}

export const WorkloadPage: React.FC<WorkloadPageProps> = ({
  liveAlerts = [],
  shipments = []
}) => {
  // Workers State
  const [workers, setWorkers] = useState<Worker[]>(baseMockWorkers);
  const [queuedTasks, setQueuedTasks] = useState<WorkloadTask[]>(
    initialMockTasks.filter(t => t.status === 'QUEUED')
  );
  const [escalatedTasks, setEscalatedTasks] = useState<WorkloadTask[]>(
    initialMockTasks.filter(t => t.status === 'ESCALATED')
  );
  const [allTasksCount, setAllTasksCount] = useState<number>(initialMockTasks.length);

  // Audit Log State
  const [auditLogs, setAuditLogs] = useState<AssignmentAuditRecord[]>([
    {
      id: 'aud-seed-1',
      taskId: 'tsk-201',
      workerId: 'wrk-dck-01',
      workerName: 'Marcus Brody',
      workerRole: 'Dock Worker',
      assignmentTime: new Date(Date.now() - 3600000).toISOString(),
      reason: 'Standard dock container crane offload inspection',
      workloadBefore: 75.0,
      workloadAfter: 87.5,
      assignmentStatus: 'ASSIGNED',
      safeguardTriggered: false
    },
    {
      id: 'aud-seed-2',
      taskId: 'tsk-204',
      workerId: 'wrk-sup-01',
      workerName: 'Maria Chen',
      workerRole: 'Supervisor',
      assignmentTime: new Date(Date.now() - 1800000).toISOString(),
      reason: 'Frontline driver at capacity (8/8). Escalated to Supervisor Maria Chen for flight gap review.',
      workloadBefore: 20.0,
      workloadAfter: 30.0,
      assignmentStatus: 'ESCALATED',
      safeguardTriggered: true
    }
  ]);

  // Filters
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Demo State
  const [demoState, setDemoState] = useState<{
    stage: 'IDLE' | 'BLOCKED' | 'ESCALATED' | 'QUEUED';
    message?: string;
    safeguardTriggered?: boolean;
    auditId?: string;
  }>({ stage: 'IDLE' });

  // Pipeline Evaluation State
  const [pipelineEvaluationResult, setPipelineEvaluationResult] = useState<{
    task: WorkloadTask;
    message: string;
    action: string;
    isSafeguarded: boolean;
    assignedTo?: string;
  } | null>(null);

  // Quick Dispatch Modal / Manual Selection State
  const [selectedWorkerForDispatch, setSelectedWorkerForDispatch] = useState<Worker | null>(null);
  const [dispatchTaskType, setDispatchTaskType] = useState<TaskType>('Temperature verification');
  const [dispatchShipmentId, setDispatchShipmentId] = useState<string>(shipments[0]?.id || 'SH-1001');

  // Summary Metrics
  const metrics = calculateWorkloadMetrics(workers, queuedTasks, escalatedTasks);

  // Filtered Workers
  const filteredWorkers = workers.filter(w => {
    if (selectedRole !== 'ALL' && w.role !== selectedRole) return false;
    if (selectedStatus !== 'ALL' && w.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        w.name.toLowerCase().includes(q) ||
        w.role.toLowerCase().includes(q) ||
        (w.location && w.location.toLowerCase().includes(q)) ||
        w.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Handler: Run Demo - Attempt Driver A Assignment
  const handleRunDemoAttemptDriver = () => {
    const driverA = workers.find(w => w.id === 'wrk-drv-01');
    if (!driverA) return;

    const demoTask: WorkloadTask = {
      id: `tsk-demo-${Date.now().toString().substring(7)}`,
      type: 'Temperature verification',
      shipmentId: 'SH-1002',
      alertId: 'alrt-recon-demo',
      priority: 'HIGH',
      createdAt: new Date().toISOString(),
      status: 'UNASSIGNED',
      description: 'Urgent spot check: 45m unverified gap reconstructed during Narita Highway transit.',
      estimatedMinutes: 20
    };

    // Attempt assignment with hard block (no auto-fallbacks)
    const result = assignTask(demoTask, driverA.id, workers, {
      allowAlternativeWorker: false,
      allowSupervisorEscalation: false,
      allowQueueFallback: false,
      reason: 'Automated gap detector flagged uncertain temperature excursion'
    });

    setAuditLogs(prev => [result.auditRecord, ...prev]);
    setDemoState({
      stage: 'BLOCKED',
      message: result.message,
      safeguardTriggered: true,
      auditId: result.auditRecord.id
    });
  };

  // Handler: Run Demo - Escalate to Supervisor
  const handleRunDemoEscalate = () => {
    const driverA = workers.find(w => w.id === 'wrk-drv-01');
    const supervisor = workers.find(w => w.id === 'wrk-sup-01');
    if (!driverA || !supervisor) return;

    const demoTask: WorkloadTask = {
      id: `tsk-demo-${Date.now().toString().substring(7)}`,
      type: 'Supervisor review',
      shipmentId: 'SH-1002',
      alertId: 'alrt-recon-demo',
      priority: 'HIGH',
      createdAt: new Date().toISOString(),
      status: 'UNASSIGNED',
      description: 'Management Review: Reconstructed thermal gap on Highway transit while Driver A is at capacity.',
      estimatedMinutes: 30
    };

    const result = assignTask(demoTask, driverA.id, workers, {
      allowAlternativeWorker: false,
      allowSupervisorEscalation: true,
      allowQueueFallback: false,
      reason: 'Driver A at capacity (8/8). Managerial review dispatched to protect frontline workload.'
    });

    setWorkers(result.updatedWorkers);
    setEscalatedTasks(prev => [result.updatedTask, ...prev]);
    setAllTasksCount(c => c + 1);
    setAuditLogs(prev => [result.auditRecord, ...prev]);

    setDemoState({
      stage: 'ESCALATED',
      message: `Safeguard active: Successfully escalated to Supervisor ${supervisor.name}. Driver A workload protected at 8/8.`,
      safeguardTriggered: true,
      auditId: result.auditRecord.id
    });
  };

  // Handler: Run Demo - Queue Task
  const handleRunDemoQueue = () => {
    const driverA = workers.find(w => w.id === 'wrk-drv-01');
    if (!driverA) return;

    const demoTask: WorkloadTask = {
      id: `tsk-demo-${Date.now().toString().substring(7)}`,
      type: 'Arrival verification',
      shipmentId: 'SH-1002',
      alertId: 'alrt-recon-demo',
      priority: 'MEDIUM',
      createdAt: new Date().toISOString(),
      status: 'UNASSIGNED',
      description: 'Deferred to destination port: Core temperature probe test upon container arrival.',
      estimatedMinutes: 25
    };

    const result = assignTask(demoTask, driverA.id, workers, {
      allowAlternativeWorker: false,
      allowSupervisorEscalation: false,
      allowQueueFallback: true,
      reason: 'Driver A at capacity. Deferred to destination dock queue to eliminate road stops.'
    });

    setQueuedTasks(prev => [result.updatedTask, ...prev]);
    setAllTasksCount(c => c + 1);
    setAuditLogs(prev => [result.auditRecord, ...prev]);

    setDemoState({
      stage: 'QUEUED',
      message: `Safeguard active: Task queued for terminal dock inspection. Driver A not interrupted on the road.`,
      safeguardTriggered: true,
      auditId: result.auditRecord.id
    });
  };

  // Handler: Run Alert to Workload Pipeline
  const handleRunAlertPipeline = (targetAlert: Alert) => {
    const res = evaluateAlertToWorkload(targetAlert, workers, {
      attemptedWorkerId: 'wrk-drv-01',
      autoEscalate: true,
      autoQueue: true
    });

    setWorkers(res.assignmentResult.updatedWorkers);
    if (res.assignmentResult.action === 'QUEUED') {
      setQueuedTasks(prev => [res.task, ...prev]);
    } else if (res.assignmentResult.action === 'ESCALATED') {
      setEscalatedTasks(prev => [res.task, ...prev]);
    }
    setAllTasksCount(c => c + 1);
    setAuditLogs(prev => [res.assignmentResult.auditRecord, ...prev]);

    setPipelineEvaluationResult({
      task: res.task,
      message: res.assignmentResult.message,
      action: res.assignmentResult.action,
      isSafeguarded: res.isSafeguardedFromDriverOverload,
      assignedTo: res.assignmentResult.assignedWorker?.name || res.assignmentResult.updatedTask.assignedWorkerName
    });
  };

  // Handler: Reset Demo
  const handleResetDemo = () => {
    setWorkers(baseMockWorkers);
    setQueuedTasks(initialMockTasks.filter(t => t.status === 'QUEUED'));
    setEscalatedTasks(initialMockTasks.filter(t => t.status === 'ESCALATED'));
    setAllTasksCount(initialMockTasks.length);
    setDemoState({ stage: 'IDLE' });
    setPipelineEvaluationResult(null);
  };

  // Handler: Manual Task Dispatch
  const handleDispatchManualTask = () => {
    if (!selectedWorkerForDispatch) return;

    const newTask: WorkloadTask = {
      id: `tsk-man-${Date.now().toString().substring(7)}`,
      type: dispatchTaskType,
      shipmentId: dispatchShipmentId,
      priority: 'MEDIUM',
      createdAt: new Date().toISOString(),
      status: 'UNASSIGNED',
      description: `Manual dispatch: ${dispatchTaskType} for Shipment ${dispatchShipmentId}`,
      estimatedMinutes: 20
    };

    const result = assignTask(newTask, selectedWorkerForDispatch.id, workers, {
      allowAlternativeWorker: false,
      allowSupervisorEscalation: false,
      allowQueueFallback: false,
      reason: `Direct dispatcher assignment to ${selectedWorkerForDispatch.name}`
    });

    if (result.success) {
      setWorkers(result.updatedWorkers);
      setAllTasksCount(c => c + 1);
      setAuditLogs(prev => [result.auditRecord, ...prev]);
      setSelectedWorkerForDispatch(null);
    } else {
      setAuditLogs(prev => [result.auditRecord, ...prev]);
      alert(`Assignment Blocked: ${result.message}`);
    }
  };

  // Helper to get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Driver':
        return <Truck className="w-4 h-4 text-cyan-400" />;
      case 'Dock Worker':
        return <Anchor className="w-4 h-4 text-blue-400" />;
      case 'Warehouse Worker':
        return <Package className="w-4 h-4 text-amber-400" />;
      case 'Supervisor':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      default:
        return <Users className="w-4 h-4 text-purple-400" />;
    }
  };

  // Helper to get status badge styling
  const getStatusBadge = (status: WorkloadStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            AVAILABLE
          </span>
        );
      case 'NEAR_CAPACITY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/80">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            NEAR_CAPACITY
          </span>
        );
      case 'AT_CAPACITY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/80 animate-pulse">
            <AlertOctagon className="w-3 h-3 text-rose-400" />
            AT_CAPACITY
          </span>
        );
      case 'OFF_SHIFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <Clock className="w-3 h-3 text-slate-400" />
            OFF_SHIFT
          </span>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 space-y-6">
      {/* Page Header & System Safeguard Rule Banner */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800/50 text-cyan-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
                  Worker Workload Safeguards
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-900/60 text-cyan-300 border border-cyan-700 font-mono">
                    Workload Safeguards
                  </span>
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  Dynamic workload-aware task assignment protecting frontline workers from sensor gap uncertainty
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleResetDemo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Lab Roster
            </button>
          </div>
        </div>

        {/* Mandatory System Design Rule Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-cyan-950/40 border border-amber-500/40 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-900/60 border border-amber-600 text-amber-300 shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                  Mandatory System Safeguard Rule
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                  HARD CONSTRAINT
                </span>
              </div>
              <p className="text-base font-semibold text-slate-100">
                &ldquo;{UNCERTAINTY_WORKLOAD_SAFEGUARD_RULE}&rdquo;
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Algorithmic sensor gap reconstruction or low-confidence telemetry anomalies must <strong>NEVER</strong> default to demanding 
                repeated, uncoordinated physical inspections from transit drivers or dock workers. When capacity caps are reached, the system 
                strictly blocks direct assignment and executes automated managerial escalation or arrival queue deferral.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Roster</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono">{metrics.totalWorkers}</div>
          <div className="text-[11px] text-slate-400">Active cold chain staff</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Available</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{metrics.availableWorkers}</div>
          <div className="text-[11px] text-slate-400">&lt; 75% capacity load</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Near Capacity</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{metrics.nearCapacityWorkers}</div>
          <div className="text-[11px] text-slate-400">75% - 99% load limit</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-rose-900/40 bg-rose-950/10 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-rose-300">
            <span>At Capacity</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">{metrics.atCapacityWorkers}</div>
          <div className="text-[11px] text-rose-300/80">Hard capped (100%)</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Queued Tasks</span>
            <Inbox className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400 font-mono">{metrics.queuedTasksCount}</div>
          <div className="text-[11px] text-slate-400">Held for dock arrival</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Escalated Tasks</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400 font-mono">{metrics.escalatedTasksCount}</div>
          <div className="text-[11px] text-slate-400">Managerial review</div>
        </div>
      </div>

      {/* Interactive Demonstration: Capacity Hard-Cap & Safeguard Verification */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-cyan-800/40 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-900/50 border border-cyan-700 text-cyan-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Live Demonstration: Driver A Hard-Cap Safeguard Verification
              </h2>
              <p className="text-xs text-slate-400">
                Simulate an urgent telemetry gap excursion assignment to Driver A (currently at 8/8 tasks)
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
            Target: Carlos Mendez (Driver A) &bull; 8 / 8 Tasks (100%)
          </span>
        </div>

        {/* Demo Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Action 1: Attempt Driver A */}
          <button
            onClick={handleRunDemoAttemptDriver}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              demoState.stage === 'BLOCKED'
                ? 'bg-rose-950/40 border-rose-600 ring-2 ring-rose-500/20'
                : 'bg-slate-950 hover:bg-slate-900/90 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-200">1. Attempt Direct Assignment</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono">
                Hard Cap 8/8
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-snug">
              Attempts to push manual verification task to Driver A who is already at 100% capacity.
            </p>
            <div className="mt-2 text-[11px] font-semibold text-rose-400 flex items-center gap-1">
              Trigger Safeguard Block <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          {/* Action 2: Escalate to Supervisor */}
          <button
            onClick={handleRunDemoEscalate}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              demoState.stage === 'ESCALATED'
                ? 'bg-emerald-950/40 border-emerald-600 ring-2 ring-emerald-500/20'
                : 'bg-slate-950 hover:bg-slate-900/90 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-200">2. Supervisor Escalation</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                Fallback Path
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-snug">
              Reroutes thermal gap investigation to Supervisor Maria Chen without interrupting the driver.
            </p>
            <div className="mt-2 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
              Escalate to Management <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          {/* Action 3: Place in Queue */}
          <button
            onClick={handleRunDemoQueue}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              demoState.stage === 'QUEUED'
                ? 'bg-indigo-950/40 border-indigo-600 ring-2 ring-indigo-500/20'
                : 'bg-slate-950 hover:bg-slate-900/90 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-200">3. Queue for Terminal Arrival</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                Safe Holding
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-snug">
              Holds core needle probe check until container reaches destination dock inspection bay.
            </p>
            <div className="mt-2 text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
              Queue for Dock Handlers <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        </div>

        {/* Demo Result Output Banner */}
        {demoState.stage !== 'IDLE' && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
              demoState.stage === 'BLOCKED'
                ? 'bg-rose-950/50 border-rose-600 text-rose-200'
                : demoState.stage === 'ESCALATED'
                ? 'bg-emerald-950/50 border-emerald-600 text-emerald-200'
                : 'bg-indigo-950/50 border-indigo-600 text-indigo-200'
            }`}
          >
            {demoState.stage === 'BLOCKED' ? (
              <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider font-mono">
                  {demoState.stage === 'BLOCKED' ? 'ASSIGNMENT REJECTED BY SYSTEM' : 'SAFEGUARD RESOLUTION EXECUTED'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-slate-300">
                  Audit ID: {demoState.auditId}
                </span>
              </div>
              <p className="text-sm font-semibold">{demoState.message}</p>
              <div className="text-xs opacity-90">
                Policy Rule: <em>&ldquo;{UNCERTAINTY_WORKLOAD_SAFEGUARD_RULE}&rdquo;</em>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alert to Workload Pipeline Bridge (Alert -> Workload Safeguard) */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Confidence-Aware Alert &rarr; Workload Safeguard Pipeline
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
              Live Bridge ({liveAlerts.length} Alerts Ingested)
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Total System Tasks: <span className="font-mono text-slate-200 font-bold">{allTasksCount}</span>
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Verify how the system automatically handles sensor uncertainty: <strong>Low-confidence reconstructed exposures</strong> do not 
          interrupt drivers with highway stops, and are instead routed to dock documentation checks or managerial review.
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => {
              const lowConfAlert: Alert = {
                id: `alrt-pipe-${Date.now().toString().substring(8)}`,
                shipmentId: shipments[0]?.id || 'SH-1002',
                sensorId: 'sns-302',
                startTime: new Date(Date.now() - 2100000).toISOString(),
                endTime: new Date().toISOString(),
                durationMinutes: 35,
                maximumTemperature: 4.8,
                threshold: 4.0,
                confidence: 62,
                status: 'LOW_CONFIDENCE_ANOMALY',
                source: 'Reconstructed',
                reason: 'Uncertain thermal reconstruction during RF deadzone (62% confidence)',
                recommendedAction: 'Verify reefer logs and documentation upon destination arrival'
              };
              handleRunAlertPipeline(lowConfAlert);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-amber-800/80 text-amber-300 text-xs font-medium transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Simulate Low-Confidence Anomaly (62% Recon)
          </button>

          <button
            onClick={() => {
              const confAlert: Alert = {
                id: `alrt-pipe-${Date.now().toString().substring(8)}`,
                shipmentId: shipments[0]?.id || 'SH-1001',
                sensorId: 'sns-301',
                startTime: new Date(Date.now() - 2700000).toISOString(),
                endTime: new Date().toISOString(),
                durationMinutes: 45,
                maximumTemperature: 6.2,
                threshold: 4.0,
                confidence: 96,
                status: 'CONFIRMED_EXPOSURE',
                source: 'Observed',
                reason: 'Direct physical probe recorded sustained thermal breach',
                recommendedAction: 'Priority Container Quarantine & Core Probe Inspection'
              };
              handleRunAlertPipeline(confAlert);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-rose-800/80 text-rose-300 text-xs font-medium transition-colors"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            Simulate Confirmed Exposure (96% Observed)
          </button>
        </div>

        {pipelineEvaluationResult && (
          <div className="mt-3 p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-2">
                Pipeline Outcome:
                <span className="font-mono text-cyan-400">{pipelineEvaluationResult.action}</span>
              </span>
              {pipelineEvaluationResult.isSafeguarded && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  Safeguard: Driver Protected From Stop
                </span>
              )}
            </div>
            <div className="text-slate-300">{pipelineEvaluationResult.message}</div>
            <div className="text-[11px] text-slate-400 font-mono">
              Task Generated: &ldquo;{pipelineEvaluationResult.task.description}&rdquo;
            </div>
          </div>
        )}
      </div>

      {/* Roster Controls: Role and Status Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search worker by name, role, or station..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Role:</span>
          </div>
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Roles</option>
            <option value="Driver">Driver</option>
            <option value="Dock Worker">Dock Worker</option>
            <option value="Warehouse Worker">Warehouse Worker</option>
            <option value="Supervisor">Supervisor</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">AVAILABLE (&lt; 75%)</option>
            <option value="NEAR_CAPACITY">NEAR_CAPACITY (75% - 99%)</option>
            <option value="AT_CAPACITY">AT_CAPACITY (100%)</option>
            <option value="OFF_SHIFT">OFF_SHIFT</option>
          </select>
        </div>
      </div>

      {/* Main Workers Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-lg">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Frontline Worker Capacity Roster ({filteredWorkers.length})
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Hard cap: Max workload cannot exceed 100%
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                <th className="py-2.5 px-4">Worker</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Tasks</th>
                <th className="py-2.5 px-4">Capacity Load</th>
                <th className="py-2.5 px-3">Hours</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Assigned Tasks</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredWorkers.map(w => {
                const percentage = calculateWorkloadPercentage(w.currentTasks, w.workloadCapacity);
                const isCapped = w.currentTasks >= w.workloadCapacity;

                // Color code capacity bar
                let barColor = 'bg-emerald-500';
                if (percentage >= 100) {
                  barColor = 'bg-rose-500';
                } else if (percentage >= 75) {
                  barColor = 'bg-amber-500';
                }

                return (
                  <tr key={w.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Worker Info */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{w.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {w.id} &bull; {w.location || w.department}
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-3">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 font-medium text-slate-300">
                        {getRoleIcon(w.role)}
                        <span>{w.role}</span>
                      </div>
                    </td>

                    {/* Tasks Count */}
                    <td className="py-3 px-3 font-mono">
                      <span className={isCapped ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                        {w.currentTasks}
                      </span>
                      <span className="text-slate-400"> / {w.workloadCapacity}</span>
                    </td>

                    {/* Capacity Progress Bar */}
                    <td className="py-3 px-4">
                      <div className="w-36 space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className={percentage >= 100 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                            {percentage}%
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {w.currentTasks}/{w.workloadCapacity} tasks
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Hours */}
                    <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">
                      {w.hoursWorked}h / 8h
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3">
                      {getStatusBadge(w.status)}
                    </td>

                    {/* Assigned Tasks count / preview */}
                    <td className="py-3 px-3">
                      <span className="text-xs text-slate-300">
                        {w.assignedTaskIds && w.assignedTaskIds.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/50">
                            <Layers className="w-3 h-3" />
                            {w.assignedTaskIds.length} Active Tasks
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None active</span>
                        )}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      {isCapped ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 px-2 py-1 rounded bg-rose-950/60 border border-rose-800/80">
                          <ShieldAlert className="w-3 h-3" />
                          At Hard Cap
                        </span>
                      ) : w.status === 'OFF_SHIFT' ? (
                        <span className="text-[11px] text-slate-400 italic">Off Duty</span>
                      ) : (
                        <button
                          onClick={() => setSelectedWorkerForDispatch(w)}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-700 transition-colors"
                        >
                          <UserCheck className="w-3 h-3" />
                          Assign Task
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Queued Tasks & Escalation Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Queued Tasks (Holding Area) */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Queued Tasks Held for Dock Arrival ({queuedTasks.length})
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Avoids highway driver stops
            </span>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {queuedTasks.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-950/50 border border-slate-800 text-center text-xs text-slate-400">
                No tasks currently in queue.
              </div>
            ) : (
              queuedTasks.map(t => (
                <div key={t.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">{t.type}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                        {t.shipmentId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{t.description}</p>
                    {t.blockingReason && (
                      <div className="text-[11px] text-amber-400 italic">
                        Reason: {t.blockingReason}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    Est: {t.estimatedMinutes}m
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Escalated Tasks (Managerial Review) */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Supervisor Escalations ({escalatedTasks.length})
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Managerial cold chain review
            </span>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {escalatedTasks.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-950/50 border border-slate-800 text-center text-xs text-slate-400">
                No active escalations.
              </div>
            ) : (
              escalatedTasks.map(t => (
                <div key={t.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-purple-300">{t.type}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                        {t.shipmentId}
                      </span>
                      {t.assignedWorkerName && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          &bull; Assigned: {t.assignedWorkerName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{t.description}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-700 font-mono">
                    ESCALATED
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Assignment Audit Log */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-lg space-y-0">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Task Assignment Audit Trail ({auditLogs.length} Records)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Immutable capacity and compliance log
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                <th className="py-2.5 px-4">Audit ID</th>
                <th className="py-2.5 px-3">Task ID</th>
                <th className="py-2.5 px-3">Worker & Role</th>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Workload Before &rarr; After</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-4">Reason / Rule Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {auditLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">
                    {log.id.substring(0, 14)}...
                  </td>
                  <td className="py-2.5 px-3 font-mono text-cyan-300">
                    {log.taskId}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-200">{log.workerName || log.workerId}</div>
                    <div className="text-[10px] text-slate-400">{log.workerRole}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                    {new Date(log.assignmentTime).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    <span className="text-slate-400">{log.workloadBefore}%</span>
                    <span className="text-slate-400 mx-1">&rarr;</span>
                    <span className={log.workloadAfter >= 100 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {log.workloadAfter}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {log.assignmentStatus === 'BLOCKED_CAPACITY' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono text-[10px]">
                        <AlertOctagon className="w-2.5 h-2.5" />
                        BLOCKED
                      </span>
                    ) : log.assignmentStatus === 'ESCALATED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono text-[10px]">
                        <ArrowUpRight className="w-2.5 h-2.5" />
                        ESCALATED
                      </span>
                    ) : log.assignmentStatus === 'QUEUED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono text-[10px]">
                        <Inbox className="w-2.5 h-2.5" />
                        QUEUED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[10px]">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        ASSIGNED
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-slate-300 text-xs">
                    {log.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Dispatch Modal */}
      {selectedWorkerForDispatch && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                Assign Task to {selectedWorkerForDispatch.name}
              </h3>
              <button
                onClick={() => setSelectedWorkerForDispatch(null)}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono"
              >
                &times; Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Target Shipment</label>
                <select
                  value={dispatchShipmentId}
                  onChange={e => setDispatchShipmentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {shipments.length > 0 ? (
                    shipments.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.id} ({s.product} &bull; {s.origin} &rarr; {s.destination})
                      </option>
                    ))
                  ) : (
                    <option value="SH-1001">SH-1001 (Yellowfin Tuna &bull; Colombo &rarr; Tokyo)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Task Type</label>
                <select
                  value={dispatchTaskType}
                  onChange={e => setDispatchTaskType(e.target.value as TaskType)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Arrival verification">Arrival verification (25 min)</option>
                  <option value="Container inspection">Container inspection (45 min)</option>
                  <option value="Temperature verification">Temperature verification (20 min)</option>
                  <option value="Documentation check">Documentation check (15 min)</option>
                  <option value="Supervisor review">Supervisor review (30 min)</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-slate-400">Current Workload:</div>
                <div className="flex items-center justify-between font-mono">
                  <span>
                    {selectedWorkerForDispatch.currentTasks} / {selectedWorkerForDispatch.workloadCapacity} Tasks
                  </span>
                  <span className="font-bold text-cyan-400">
                    &rarr; Will become {selectedWorkerForDispatch.currentTasks + 1} / {selectedWorkerForDispatch.workloadCapacity} (
                    {calculateWorkloadPercentage(selectedWorkerForDispatch.currentTasks + 1, selectedWorkerForDispatch.workloadCapacity)}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedWorkerForDispatch(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDispatchManualTask}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
