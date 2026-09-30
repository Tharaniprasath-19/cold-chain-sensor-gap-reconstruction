/**
 * ColdChain Insight - Worker Workload Safeguards Engine
 * 
 * CORE PRINCIPLE:
 * "Uncertainty must not be resolved by exceeding frontline worker workload capacity."
 * 
 * Sensor telemetry gaps and low-confidence algorithmic reconstructions must NEVER
 * automatically translate into burdensome, uncoordinated manual verification tasks 
 * that push frontline drivers, dock handlers, or warehouse workers past safe capacity caps.
 */

import type {
  Worker,
  WorkloadStatus,
  WorkloadTask,
  TaskType,
  TaskPriority,
  AssignmentResolution,
  AssignmentAuditRecord,
  WorkloadSummaryMetrics,
  Alert
} from '../../types';

/**
 * Mandatory System Rule Constant
 */
export const UNCERTAINTY_WORKLOAD_SAFEGUARD_RULE = 
  "Uncertainty must not be resolved by exceeding frontline worker workload capacity.";

/**
 * Standard Task Type default estimates
 */
export const TASK_ESTIMATED_MINUTES: Record<TaskType, number> = {
  'Arrival verification': 25,
  'Container inspection': 45,
  'Temperature verification': 20,
  'Documentation check': 15,
  'Supervisor review': 30,
};

/**
 * Calculate workload percentage with 1 decimal precision
 */
export function calculateWorkloadPercentage(currentTasks: number, capacity: number): number {
  if (capacity <= 0) return 100;
  return Number(((currentTasks / capacity) * 100).toFixed(1));
}

/**
 * Determine dynamic workload status based on current tasks vs capacity
 */
export function determineWorkloadStatus(
  currentTasks: number,
  capacity: number,
  availability: boolean,
  hoursWorked: number = 0
): WorkloadStatus {
  if (!availability || hoursWorked >= 10) {
    return 'OFF_SHIFT';
  }
  if (currentTasks >= capacity) {
    return 'AT_CAPACITY';
  }
  const percentage = (currentTasks / capacity) * 100;
  if (percentage >= 75) {
    return 'NEAR_CAPACITY';
  }
  return 'AVAILABLE';
}

/**
 * Assignment Execution Result
 */
export interface AssignmentResult {
  success: boolean;
  action: AssignmentResolution;
  updatedWorkers: Worker[];
  updatedTask: WorkloadTask;
  auditRecord: AssignmentAuditRecord;
  message: string;
  assignedWorker?: Worker;
  safeguardTriggered: boolean;
  ruleCitation?: string;
}

/**
 * Assign a task to a worker with strict capacity hard-capping and fallback paths:
 * 1. Available worker
 * 2. Supervisor escalation
 * 3. Queue task
 * 4. Deferred review
 */
export function assignTask(
  task: WorkloadTask,
  targetWorkerId: string,
  workers: Worker[],
  options?: {
    allowAlternativeWorker?: boolean;
    allowSupervisorEscalation?: boolean;
    allowQueueFallback?: boolean;
    reason?: string;
  }
): AssignmentResult {
  const workerIndex = workers.findIndex(w => w.id === targetWorkerId);
  const assignmentTime = new Date().toISOString();

  if (workerIndex === -1) {
    const auditRecord: AssignmentAuditRecord = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      taskId: task.id,
      alertId: task.alertId,
      workerId: targetWorkerId,
      assignmentTime,
      reason: options?.reason || 'Worker lookup failed',
      workloadBefore: 0,
      workloadAfter: 0,
      assignmentStatus: 'BLOCKED_CAPACITY',
      safeguardTriggered: false
    };

    return {
      success: false,
      action: 'BLOCKED_CAPACITY',
      updatedWorkers: [...workers],
      updatedTask: {
        ...task,
        status: 'BLOCKED',
        blockingReason: `Worker ${targetWorkerId} not found in roster.`
      },
      auditRecord,
      message: `Worker ${targetWorkerId} not found.`,
      safeguardTriggered: false
    };
  }

  const targetWorker = workers[workerIndex];
  const workloadBefore = calculateWorkloadPercentage(targetWorker.currentTasks, targetWorker.workloadCapacity);

  // Check Hard Constraint:
  // NEVER assign a manual verification task to a worker whose workload is at or above the hard cap.
  const isAtCapacity = targetWorker.currentTasks >= targetWorker.workloadCapacity;
  const isOffShift = targetWorker.status === 'OFF_SHIFT' || !targetWorker.availability;

  if (isAtCapacity || isOffShift) {
    const blockingReason = "Task not assigned: worker has reached workload capacity.";

    // Fallback Option 1: Find alternative available worker with same role
    if (options?.allowAlternativeWorker) {
      const alternativeWorker = workers.find(
        w => w.id !== targetWorker.id &&
             w.role === targetWorker.role &&
             w.availability &&
             w.currentTasks < w.workloadCapacity &&
             w.status !== 'OFF_SHIFT'
      );

      if (alternativeWorker) {
        return assignTask(task, alternativeWorker.id, workers, {
          ...options,
          allowAlternativeWorker: false,
          reason: `Reassigned from ${targetWorker.name} (At Capacity) to eligible peer ${alternativeWorker.name}`
        });
      }
    }

    // Fallback Option 2: Supervisor Escalation
    if (options?.allowSupervisorEscalation) {
      const availableSupervisor = workers.find(
        w => w.role === 'Supervisor' &&
             w.availability &&
             w.currentTasks < w.workloadCapacity
      );

      if (availableSupervisor) {
        const supIndex = workers.findIndex(w => w.id === availableSupervisor.id);
        const supBefore = calculateWorkloadPercentage(availableSupervisor.currentTasks, availableSupervisor.workloadCapacity);
        const newCurrentTasks = availableSupervisor.currentTasks + 1;
        const supAfter = calculateWorkloadPercentage(newCurrentTasks, availableSupervisor.workloadCapacity);
        const newStatus = determineWorkloadStatus(newCurrentTasks, availableSupervisor.workloadCapacity, true, availableSupervisor.hoursWorked);

        const updatedSupervisor: Worker = {
          ...availableSupervisor,
          currentTasks: newCurrentTasks,
          status: newStatus,
          assignedTaskIds: [...(availableSupervisor.assignedTaskIds || []), task.id]
        };

        const updatedWorkers = [...workers];
        updatedWorkers[supIndex] = updatedSupervisor;

        const updatedTask: WorkloadTask = {
          ...task,
          status: 'ESCALATED',
          assignedWorkerId: availableSupervisor.id,
          assignedWorkerName: availableSupervisor.name,
          assignedWorkerRole: availableSupervisor.role,
          blockingReason: undefined
        };

        const auditRecord: AssignmentAuditRecord = {
          id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          taskId: task.id,
          alertId: task.alertId,
          workerId: availableSupervisor.id,
          workerName: availableSupervisor.name,
          workerRole: availableSupervisor.role,
          assignmentTime,
          reason: `Frontline worker ${targetWorker.name} at capacity. Escalated to ${availableSupervisor.name} for managerial resolution.`,
          workloadBefore: supBefore,
          workloadAfter: supAfter,
          assignmentStatus: 'ESCALATED',
          safeguardTriggered: true
        };

        return {
          success: true,
          action: 'ESCALATED',
          updatedWorkers,
          updatedTask,
          auditRecord,
          message: `Worker at capacity. Successfully escalated task to Supervisor ${availableSupervisor.name}.`,
          assignedWorker: updatedSupervisor,
          safeguardTriggered: true,
          ruleCitation: UNCERTAINTY_WORKLOAD_SAFEGUARD_RULE
        };
      }
    }

    // Fallback Option 3: Queue Task
    if (options?.allowQueueFallback) {
      const updatedTask: WorkloadTask = {
        ...task,
        status: 'QUEUED',
        blockingReason: blockingReason
      };

      const auditRecord: AssignmentAuditRecord = {
        id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        taskId: task.id,
        alertId: task.alertId,
        workerId: targetWorker.id,
        workerName: targetWorker.name,
        workerRole: targetWorker.role,
        assignmentTime,
        reason: `${blockingReason} Task safely placed in workload holding queue.`,
        workloadBefore,
        workloadAfter: workloadBefore,
        assignmentStatus: 'QUEUED',
        safeguardTriggered: true
      };

      return {
        success: false,
        action: 'QUEUED',
        updatedWorkers: [...workers],
        updatedTask,
        auditRecord,
        message: `${blockingReason} Placed in queue.`,
        safeguardTriggered: true,
        ruleCitation: UNCERTAINTY_WORKLOAD_SAFEGUARD_RULE
      };
    }

    // Default: Hard Block
    const updatedTask: WorkloadTask = {
      ...task,
      status: 'BLOCKED',
      blockingReason: blockingReason
    };

    const auditRecord: AssignmentAuditRecord = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      taskId: task.id,
      alertId: task.alertId,
      workerId: targetWorker.id,
      workerName: targetWorker.name,
      workerRole: targetWorker.role,
      assignmentTime,
      reason: options?.reason || `${blockingReason} Direct assignment blocked by safeguard policy.`,
      workloadBefore,
      workloadAfter: workloadBefore,
      assignmentStatus: 'BLOCKED_CAPACITY',
      safeguardTriggered: true
    };

    return {
      success: false,
      action: 'BLOCKED_CAPACITY',
      updatedWorkers: [...workers],
      updatedTask,
      auditRecord,
      message: blockingReason,
      safeguardTriggered: true,
      ruleCitation: UNCERTAINTY_WORKLOAD_SAFEGUARD_RULE
    };
  }

  // Eligible assignment: Worker has capacity
  const newCurrentTasks = targetWorker.currentTasks + 1;
  const workloadAfter = calculateWorkloadPercentage(newCurrentTasks, targetWorker.workloadCapacity);
  const newStatus = determineWorkloadStatus(
    newCurrentTasks,
    targetWorker.workloadCapacity,
    targetWorker.availability,
    targetWorker.hoursWorked
  );

  const updatedWorker: Worker = {
    ...targetWorker,
    currentTasks: newCurrentTasks,
    status: newStatus,
    assignedTaskIds: [...(targetWorker.assignedTaskIds || []), task.id]
  };

  const updatedWorkers = [...workers];
  updatedWorkers[workerIndex] = updatedWorker;

  const updatedTask: WorkloadTask = {
    ...task,
    status: 'ASSIGNED',
    assignedWorkerId: targetWorker.id,
    assignedWorkerName: targetWorker.name,
    assignedWorkerRole: targetWorker.role,
    blockingReason: undefined
  };

  const auditRecord: AssignmentAuditRecord = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    taskId: task.id,
    alertId: task.alertId,
    workerId: targetWorker.id,
    workerName: targetWorker.name,
    workerRole: targetWorker.role,
    assignmentTime,
    reason: options?.reason || `Standard dispatch: assigned to ${targetWorker.name} (${targetWorker.role}).`,
    workloadBefore,
    workloadAfter,
    assignmentStatus: 'ASSIGNED',
    safeguardTriggered: false
  };

  return {
    success: true,
    action: 'ASSIGNED',
    updatedWorkers,
    updatedTask,
    auditRecord,
    message: `Assigned to ${targetWorker.name}. Workload increased to ${workloadAfter}%.`,
    assignedWorker: updatedWorker,
    safeguardTriggered: false
  };
}

/**
 * Alert to Workload Pipeline Connector
 * Connects alert intelligence to workload dispatch.
 * 
 * DESIGN RULE ENFORCEMENT:
 * "The system must NOT resolve uncertainty by defaulting to: 'Ask driver to manually check temperature more frequently.'"
 */
export function evaluateAlertToWorkload(
  alert: Alert,
  workers: Worker[],
  options?: {
    attemptedWorkerId?: string;
    autoEscalate?: boolean;
    autoQueue?: boolean;
  }
): {
  task: WorkloadTask;
  assignmentResult: AssignmentResult;
  ruleCitation: string;
  isSafeguardedFromDriverOverload: boolean;
} {
  // Determine appropriate Task Type and Priority based on Alert severity
  let taskType: TaskType = 'Temperature verification';
  let priority: TaskPriority = 'MEDIUM';
  let taskDescription = `Verify thermal conditions for Shipment ${alert.shipmentId} (Sensor: ${alert.sensorId}).`;

  if (alert.status === 'CONFIRMED_EXPOSURE') {
    taskType = 'Container inspection';
    priority = 'CRITICAL';
    taskDescription = `Urgent Container Quarantine & Core Probe Inspection: Sustained ${alert.durationMinutes}m breach peaking at ${alert.maximumTemperature}°C.`;
  } else if (alert.status === 'POSSIBLE_EXPOSURE') {
    taskType = 'Arrival verification';
    priority = 'HIGH';
    taskDescription = `Priority Arrival Inspection: Reconstructed breach with ${alert.confidence}% confidence. Inspect container upon berth docking.`;
  } else if (alert.status === 'LOW_CONFIDENCE_ANOMALY') {
    // Low-confidence reconstructed anomaly:
    // Strictly avoid interrupting driver on the highway!
    taskType = 'Documentation check';
    priority = 'LOW';
    taskDescription = `Review telemetry logs and reefer compressor run logs for Shipment ${alert.shipmentId}. (Low-confidence reconstruction ${alert.confidence}%: do NOT request manual driver stops).`;
  }

  const task: WorkloadTask = {
    id: `tsk-alrt-${alert.id.substring(0, 8)}`,
    type: taskType,
    shipmentId: alert.shipmentId,
    alertId: alert.id,
    priority,
    createdAt: new Date().toISOString(),
    status: 'UNASSIGNED',
    description: taskDescription,
    estimatedMinutes: TASK_ESTIMATED_MINUTES[taskType]
  };

  // If target worker is explicitly provided or defaults to a driver:
  let targetWorkerId = options?.attemptedWorkerId;

  if (!targetWorkerId) {
    // If low confidence anomaly, do NOT choose a driver
    if (alert.status === 'LOW_CONFIDENCE_ANOMALY') {
      const dockOrWarehouse = workers.find(
        w => (w.role === 'Dock Worker' || w.role === 'Warehouse Worker') &&
             w.availability &&
             w.currentTasks < w.workloadCapacity
      );
      targetWorkerId = dockOrWarehouse ? dockOrWarehouse.id : workers[0]?.id;
    } else {
      // Find eligible worker
      const eligible = workers.find(
        w => w.availability && w.currentTasks < w.workloadCapacity
      );
      targetWorkerId = eligible ? eligible.id : workers[0]?.id;
    }
  }

  const assignmentResult = assignTask(task, targetWorkerId, workers, {
    allowAlternativeWorker: true,
    allowSupervisorEscalation: options?.autoEscalate ?? true,
    allowQueueFallback: options?.autoQueue ?? true,
    reason: `Generated from Alert [${alert.status}] on Shipment ${alert.shipmentId}`
  });

  return {
    task: assignmentResult.updatedTask,
    assignmentResult,
    ruleCitation: UNCERTAINTY_WORKLOAD_SAFEGUARD_RULE,
    isSafeguardedFromDriverOverload: alert.status === 'LOW_CONFIDENCE_ANOMALY'
  };
}

/**
 * Calculate Fleet Workload Summary Metrics for Dashboard KPI Cards
 */
export function calculateWorkloadMetrics(
  workers: Worker[],
  queuedTasks: WorkloadTask[] = [],
  escalatedTasks: WorkloadTask[] = []
): WorkloadSummaryMetrics {
  const totalWorkers = workers.length;
  const availableWorkers = workers.filter(w => w.status === 'AVAILABLE').length;
  const nearCapacityWorkers = workers.filter(w => w.status === 'NEAR_CAPACITY').length;
  const atCapacityWorkers = workers.filter(w => w.status === 'AT_CAPACITY').length;
  const offShiftWorkers = workers.filter(w => w.status === 'OFF_SHIFT').length;
  const queuedTasksCount = queuedTasks.filter(t => t.status === 'QUEUED').length;
  const escalatedTasksCount = escalatedTasks.filter(t => t.status === 'ESCALATED').length;

  return {
    totalWorkers,
    availableWorkers,
    nearCapacityWorkers,
    atCapacityWorkers,
    offShiftWorkers,
    queuedTasksCount,
    escalatedTasksCount,
  };
}

/**
 * Initial Mock Tasks representing pending cold-chain operations
 */
export const initialMockTasks: WorkloadTask[] = [
  {
    id: 'tsk-201',
    type: 'Container inspection',
    shipmentId: 'SH-1001',
    priority: 'HIGH',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    assignedWorkerId: 'wrk-dck-01',
    assignedWorkerName: 'Marcus Brody',
    assignedWorkerRole: 'Dock Worker',
    status: 'ASSIGNED',
    description: 'Verify container air curtain & secondary door seals upon crane offload.',
    estimatedMinutes: 45
  },
  {
    id: 'tsk-202',
    type: 'Temperature verification',
    shipmentId: 'SH-1002',
    priority: 'MEDIUM',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    status: 'QUEUED',
    description: 'Spot check on core tuna temperature using calibrated handheld needle probe.',
    estimatedMinutes: 20
  },
  {
    id: 'tsk-203',
    type: 'Arrival verification',
    shipmentId: 'SH-1003',
    priority: 'HIGH',
    createdAt: new Date(Date.now() - 5400000).toISOString(),
    status: 'QUEUED',
    description: 'Verify reefer digital display and confirm power plug-in at Tokyo terminal.',
    estimatedMinutes: 25
  },
  {
    id: 'tsk-204',
    type: 'Supervisor review',
    shipmentId: 'SH-1004',
    priority: 'CRITICAL',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    assignedWorkerId: 'wrk-sup-01',
    assignedWorkerName: 'Maria Chen',
    assignedWorkerRole: 'Supervisor',
    status: 'ESCALATED',
    description: 'Escalated from Driver A (at capacity): Evaluate thermal gap reconstruction during flight leg.',
    estimatedMinutes: 30
  }
];
