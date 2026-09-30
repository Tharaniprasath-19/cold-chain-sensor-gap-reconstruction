/**
 * Unit Tests for Worker Workload Safeguards Engine
 * 
 * Verifies:
 * 1. Available worker assignment & workload percentage calculation
 * 2. Near-capacity worker detection (7/8 = 87.5% NEAR_CAPACITY)
 * 3. At-capacity worker detection (8/8 = 100% AT_CAPACITY)
 * 4. Hard constraint: Blocked assignment when worker is at capacity
 * 5. Expected block display message: "Task not assigned: worker has reached workload capacity."
 * 6. Alternative worker fallback
 * 7. Queued task fallback
 * 8. Supervisor escalation fallback
 * 9. Core system rule: "Uncertainty must not be resolved by exceeding frontline worker workload capacity."
 * 10. Alert-to-workload pipeline (handling low-confidence alerts without driver overload)
 * 11. Assignment audit records (taskId, worker, workloadBefore, workloadAfter, reason)
 * 12. Summary metrics calculation
 */

import {
  calculateWorkloadPercentage,
  determineWorkloadStatus,
  assignTask,
  evaluateAlertToWorkload,
  calculateWorkloadMetrics,
  UNCERTAINTY_WORKLOAD_SAFEGUARD_RULE,
  TASK_ESTIMATED_MINUTES
} from '../workloadEngine';
import type { Worker, WorkloadTask, Alert } from '../../../types';

function runTests() {
  console.log('🧪 Running Worker Workload Safeguards Unit Tests...\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      throw new Error(`Test assertion failed: ${testName}`);
    }
  }

  // Sample Workers for testing
  const createMockWorkers = (): Worker[] => [
    {
      id: 'driver-a',
      name: 'Carlos Mendez (Driver A)',
      role: 'Driver',
      shift: 'Morning (06:00 - 14:00)',
      currentTasks: 8,
      completedTasks: 14,
      workloadCapacity: 8,
      hoursWorked: 7.5,
      availability: true,
      status: 'AT_CAPACITY'
    },
    {
      id: 'driver-b',
      name: 'Jean-Luc Moreau',
      role: 'Driver',
      shift: 'Morning (06:00 - 14:00)',
      currentTasks: 3,
      completedTasks: 9,
      workloadCapacity: 8,
      hoursWorked: 5.0,
      availability: true,
      status: 'AVAILABLE'
    },
    {
      id: 'dock-worker-1',
      name: 'Marcus Brody',
      role: 'Dock Worker',
      shift: 'Morning (07:00 - 15:00)',
      currentTasks: 7,
      completedTasks: 18,
      workloadCapacity: 8,
      hoursWorked: 6.5,
      availability: true,
      status: 'NEAR_CAPACITY'
    },
    {
      id: 'dock-worker-2',
      name: 'Ananya Patel',
      role: 'Dock Worker',
      shift: 'Afternoon (14:00 - 22:00)',
      currentTasks: 2,
      completedTasks: 10,
      workloadCapacity: 8,
      hoursWorked: 3.0,
      availability: true,
      status: 'AVAILABLE'
    },
    {
      id: 'supervisor-1',
      name: 'Maria Chen',
      role: 'Supervisor',
      shift: 'General Oversight',
      currentTasks: 3,
      completedTasks: 28,
      workloadCapacity: 10,
      hoursWorked: 4.5,
      availability: true,
      status: 'AVAILABLE'
    },
    {
      id: 'driver-c',
      name: 'Frank Kowalski',
      role: 'Driver',
      shift: 'Night',
      currentTasks: 0,
      completedTasks: 12,
      workloadCapacity: 8,
      hoursWorked: 9.0,
      availability: false,
      status: 'OFF_SHIFT'
    }
  ];

  const sampleTask: WorkloadTask = {
    id: 'test-tsk-001',
    type: 'Temperature verification',
    shipmentId: 'SH-1002',
    alertId: 'alrt-test-88',
    priority: 'HIGH',
    createdAt: new Date().toISOString(),
    status: 'UNASSIGNED',
    description: 'Verify tuna core temperature at customs transfer',
    estimatedMinutes: 20
  };

  // 1. Workload calculation & Status
  const pct1 = calculateWorkloadPercentage(7, 8);
  assert(pct1 === 87.5, 'Test 1: 7 / 8 tasks calculates to 87.5% workload');

  const statusNear = determineWorkloadStatus(7, 8, true, 6);
  assert(statusNear === 'NEAR_CAPACITY', 'Test 1: 7 / 8 tasks classified as NEAR_CAPACITY');

  const statusAt = determineWorkloadStatus(8, 8, true, 7.5);
  assert(statusAt === 'AT_CAPACITY', 'Test 1: 8 / 8 tasks classified as AT_CAPACITY');

  const statusAvail = determineWorkloadStatus(3, 8, true, 4);
  assert(statusAvail === 'AVAILABLE', 'Test 1: 3 / 8 tasks classified as AVAILABLE');

  const statusOff = determineWorkloadStatus(0, 8, false, 0);
  assert(statusOff === 'OFF_SHIFT', 'Test 1: Unavailable worker classified as OFF_SHIFT');

  // 2. Available worker assignment
  const workersA = createMockWorkers();
  const assignResultA = assignTask(sampleTask, 'driver-b', workersA);
  assert(assignResultA.success === true, 'Test 2: Available worker assignment succeeds');
  assert(assignResultA.action === 'ASSIGNED', 'Test 2: Action is ASSIGNED');
  assert(assignResultA.updatedTask.status === 'ASSIGNED', 'Test 2: Task status is ASSIGNED');
  assert(assignResultA.updatedTask.assignedWorkerId === 'driver-b', 'Test 2: Assigned worker ID matches');
  const updatedDriverB = assignResultA.updatedWorkers.find(w => w.id === 'driver-b');
  assert(updatedDriverB?.currentTasks === 4, 'Test 2: Worker currentTasks incremented from 3 to 4');
  assert(assignResultA.auditRecord.workloadBefore === 37.5, 'Test 2: Audit records workloadBefore = 37.5%');
  assert(assignResultA.auditRecord.workloadAfter === 50.0, 'Test 2: Audit records workloadAfter = 50.0%');

  // 3. Near-capacity worker assignment
  const workersB = createMockWorkers();
  const nearTask: WorkloadTask = { ...sampleTask, id: 'test-tsk-002', type: 'Arrival verification' };
  const assignResultNear = assignTask(nearTask, 'dock-worker-1', workersB);
  assert(assignResultNear.success === true, 'Test 3: Near-capacity worker can accept task up to cap');
  const updatedDock1 = assignResultNear.updatedWorkers.find(w => w.id === 'dock-worker-1');
  assert(updatedDock1?.currentTasks === 8, 'Test 3: Current tasks reaches cap 8/8');
  assert(updatedDock1?.status === 'AT_CAPACITY', 'Test 3: Status transitions from NEAR_CAPACITY to AT_CAPACITY');

  // 4. Hard Constraint: Blocked assignment when worker is AT_CAPACITY
  const workersC = createMockWorkers();
  const blockedTask: WorkloadTask = { ...sampleTask, id: 'test-tsk-003' };
  const blockResult = assignTask(blockedTask, 'driver-a', workersC, {
    allowAlternativeWorker: false,
    allowSupervisorEscalation: false,
    allowQueueFallback: false
  });
  assert(blockResult.success === false, 'Test 4: Assignment blocked for worker at capacity');
  assert(blockResult.action === 'BLOCKED_CAPACITY', 'Test 4: Action is BLOCKED_CAPACITY');
  assert(blockResult.message === 'Task not assigned: worker has reached workload capacity.', 
    'Test 4: Message exactly displays "Task not assigned: worker has reached workload capacity."');
  assert(blockResult.safeguardTriggered === true, 'Test 4: Safeguard flag is triggered');
  assert(blockResult.updatedTask.status === 'BLOCKED', 'Test 4: Task status marked BLOCKED');
  assert(blockResult.updatedTask.blockingReason?.includes('capacity') === true, 'Test 4: Blocking reason recorded');

  // 5. Alternative worker fallback
  const workersD = createMockWorkers();
  const altTask: WorkloadTask = { ...sampleTask, id: 'test-tsk-004' };
  const altResult = assignTask(altTask, 'driver-a', workersD, {
    allowAlternativeWorker: true,
    allowSupervisorEscalation: false,
    allowQueueFallback: false
  });
  assert(altResult.success === true, 'Test 5: Assignment rerouted to eligible peer worker');
  assert(altResult.updatedTask.assignedWorkerId === 'driver-b', 'Test 5: Task assigned to available Driver B instead of Driver A');
  assert(altResult.safeguardTriggered === false, 'Test 5: Fallback completed successfully');

  // 6. Queue Task fallback
  const workersE = createMockWorkers();
  const queueTaskObj: WorkloadTask = { ...sampleTask, id: 'test-tsk-005' };
  const queueResult = assignTask(queueTaskObj, 'driver-a', workersE, {
    allowAlternativeWorker: false,
    allowSupervisorEscalation: false,
    allowQueueFallback: true
  });
  assert(queueResult.action === 'QUEUED', 'Test 6: Fallback action is QUEUED');
  assert(queueResult.updatedTask.status === 'QUEUED', 'Test 6: Task status set to QUEUED');
  assert(queueResult.safeguardTriggered === true, 'Test 6: Safeguard triggered');
  assert(queueResult.auditRecord.assignmentStatus === 'QUEUED', 'Test 6: Audit record status is QUEUED');

  // 7. Supervisor Escalation fallback
  const workersF = createMockWorkers();
  const escTaskObj: WorkloadTask = { ...sampleTask, id: 'test-tsk-006' };
  const escResult = assignTask(escTaskObj, 'driver-a', workersF, {
    allowAlternativeWorker: false,
    allowSupervisorEscalation: true,
    allowQueueFallback: false
  });
  assert(escResult.success === true, 'Test 7: Supervisor escalation succeeds');
  assert(escResult.action === 'ESCALATED', 'Test 7: Action is ESCALATED');
  assert(escResult.updatedTask.status === 'ESCALATED', 'Test 7: Task status is ESCALATED');
  assert(escResult.updatedTask.assignedWorkerRole === 'Supervisor', 'Test 7: Assigned to Supervisor');
  assert(escResult.assignedWorker?.name === 'Maria Chen', 'Test 7: Supervisor Maria Chen assigned');
  const updatedSup = escResult.updatedWorkers.find(w => w.id === 'supervisor-1');
  assert(updatedSup?.currentTasks === 4, 'Test 7: Supervisor current tasks updated to 4');

  // 8. Explicit System Rule Constant
  assert(
    UNCERTAINTY_WORKLOAD_SAFEGUARD_RULE === "Uncertainty must not be resolved by exceeding frontline worker workload capacity.",
    'Test 8: System rule constant matches exact mandatory wording'
  );

  // 9. Alert to Workload Pipeline Integration
  const workersG = createMockWorkers();
  const lowConfidenceAlert: Alert = {
    id: 'alrt-gap-991',
    shipmentId: 'SH-1002',
    sensorId: 'sns-302',
    startTime: '2026-09-28T14:00:00Z',
    endTime: '2026-09-28T14:30:00Z',
    durationMinutes: 30,
    maximumTemperature: 4.8,
    threshold: 4.0,
    confidence: 62, // Low confidence
    status: 'LOW_CONFIDENCE_ANOMALY',
    source: 'Reconstructed',
    reason: 'Uncertain thermal reconstruction during 30m RF shadowing',
    recommendedAction: 'Secondary dock review upon arrival'
  };

  const alertPipelineResult = evaluateAlertToWorkload(lowConfidenceAlert, workersG, {
    attemptedWorkerId: 'driver-a'
  });

  assert(
    alertPipelineResult.isSafeguardedFromDriverOverload === true,
    'Test 9: Low-confidence alert flagged with isSafeguardedFromDriverOverload = true'
  );
  assert(
    alertPipelineResult.task.type === 'Documentation check',
    'Test 9: Low-confidence alert does not spam driver with temperature re-checks; creates documentation check instead'
  );
  assert(
    alertPipelineResult.ruleCitation === UNCERTAINTY_WORKLOAD_SAFEGUARD_RULE,
    'Test 9: Cites mandatory workload safeguard rule'
  );

  // 10. Assignment Audit Record Schema
  const audit = assignResultA.auditRecord;
  assert(Boolean(audit.id), 'Test 10: Audit record has ID');
  assert(audit.taskId === 'test-tsk-001', 'Test 10: Audit record matches taskId');
  assert(audit.workerId === 'driver-b', 'Test 10: Audit record matches workerId');
  assert(Boolean(audit.assignmentTime), 'Test 10: Audit record has ISO assignmentTime');
  assert(Boolean(audit.reason), 'Test 10: Audit record has explanatory reason');
  assert(typeof audit.workloadBefore === 'number', 'Test 10: Audit record contains numeric workloadBefore');
  assert(typeof audit.workloadAfter === 'number', 'Test 10: Audit record contains numeric workloadAfter');
  assert(audit.assignmentStatus === 'ASSIGNED', 'Test 10: Audit record contains assignmentStatus');

  // 11. Workload Summary Metrics
  const sampleQueue: WorkloadTask[] = [
    { ...sampleTask, id: 'q1', status: 'QUEUED' },
    { ...sampleTask, id: 'q2', status: 'QUEUED' }
  ];
  const sampleEsc: WorkloadTask[] = [
    { ...sampleTask, id: 'e1', status: 'ESCALATED' }
  ];
  const metrics = calculateWorkloadMetrics(createMockWorkers(), sampleQueue, sampleEsc);
  assert(metrics.totalWorkers === 6, 'Test 11: totalWorkers is 6');
  assert(metrics.availableWorkers === 3, 'Test 11: availableWorkers is 3');
  assert(metrics.nearCapacityWorkers === 1, 'Test 11: nearCapacityWorkers is 1');
  assert(metrics.atCapacityWorkers === 1, 'Test 11: atCapacityWorkers is 1');
  assert(metrics.offShiftWorkers === 1, 'Test 11: offShiftWorkers is 1');
  assert(metrics.queuedTasksCount === 2, 'Test 11: queuedTasksCount is 2');
  assert(metrics.escalatedTasksCount === 1, 'Test 11: escalatedTasksCount is 1');

  // 12. Standard Task Type Estimations
  assert(TASK_ESTIMATED_MINUTES['Temperature verification'] === 20, 'Test 12: Standard task estimated minutes tracked');

  console.log(`\n🎉 Results: ${passedTests}/${totalTests} workload safeguard tests passed cleanly.\n`);
}

runTests();
