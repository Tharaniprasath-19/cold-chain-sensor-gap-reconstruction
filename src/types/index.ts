export type StatusCategory = 
  | 'Observed' 
  | 'Reconstructed' 
  | 'Unknown' 
  | 'Warning' 
  | 'Critical' 
  | 'Healthy';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type LegType = 
  | 'Processing Plant'
  | 'Reefer Truck Transport'
  | 'Cold Storage Facility'
  | 'Port Cargo Staging'
  | 'Air Freight Cargo'
  | 'Ocean Vessel Transit'
  | 'Customs Inspection'
  | 'Destination Distribution Center';

export interface Shipment {
  id: string;
  code: string; // e.g. "SHP-2026-8891"
  product: string; // e.g. "Sashimi-Grade Yellowfin Tuna"
  productCategory: string; // "Fresh Tuna", "Frozen Salmon", "Live Shellfish"
  origin: string; // e.g. "Colombo Export Hub, Sri Lanka"
  destination: string; // e.g. "Narita International Airport, Tokyo"
  currentLeg: LegType;
  temperatureStatus: StatusCategory;
  sensorStatus: StatusCategory;
  confidence: number; // 0 to 100 percentage
  riskLevel: RiskLevel;
  targetTempMin: number; // e.g. -2.0 °C
  targetTempMax: number; // e.g. +2.0 °C
  currentTemp: number; // e.g. -0.8 °C
  totalVolumeKg: number;
  exportCertNumber: string;
  carrier: string;
  createdDate: string;
  estimatedArrival: string;
  sensorIds: string[];
  gapCount: number;
}

export interface Sensor {
  id: string;
  serialNumber: string;
  model: string;
  type: 'IoT Gateway' | 'BLE Sensor Node' | 'Satellite Thermal Tracker' | 'Deep-Chill Probe';
  status: StatusCategory;
  batteryLevel: number; // 0 to 100
  signalStrengthRssi: number; // e.g. -72 dBm
  lastPing: string;
  location: string;
  currentShipmentId?: string;
  legId?: string;
  calibrationStatus: 'Valid' | 'Due Soon' | 'Expired';
  lastCalibrationDate: string;
}

export type ReadingStatus = 'Observed' | 'Dropped' | 'Buffered' | 'Unknown';

export type ConnectivityStatus = 'Connected' | 'Buffered' | 'Offline' | 'Outage';

export interface SensorReading {
  id: string;
  shipment_id: string;
  sensor_id: string;
  timestamp: string; // Device timestamp (includes clock skew)
  ground_truth_temperature: number; // Internal true physical temperature (°C)
  observed_temperature: number | null; // Temperature recorded by sensor (null if dropped)
  temperature: number; // Convenient display temperature (equals observed_temperature or ground_truth if missing)
  humidity: number; // %
  shock: number; // g-force
  tilt: number; // degrees
  latitude: number;
  longitude: number;
  signal_strength: number; // dBm
  battery_level: number; // %
  connectivity_status: ConnectivityStatus;
  status: ReadingStatus;
  clock_skew_seconds: number;
  leg_name: LegType;

  // Legacy backwards compatibility properties
  sensorId?: string;
  shipmentId?: string;
  isObserved?: boolean;
  isReconstructed?: boolean;
  locationName?: string;
}

export interface SimulationConfig {
  seed: number;
  numShipments: number;
  numSensorsPerShipment: number;
  pingIntervalMinutes: number;
  dropoutProbability: number; // 0.0 to 1.0
  noiseLevel: number; // std dev in °C
  deadSensorProbability: number; // 0.0 to 1.0
  clockSkewMaxSeconds: number;
  calibrationDriftMax: number; // max drift in °C
  networkOutageDurationMinutes: number;
}

export interface SimulationSummary {
  totalReadings: number;
  totalGaps: number;
  totalSensors: number;
  totalShipments: number;
  seed: number;
  generatedAt: string;
}

export type GapType = 
  | 'RANDOM_DROPOUT'
  | 'NETWORK_OUTAGE'
  | 'DEAD_SENSOR'
  | 'LOW_SIGNAL'
  | 'CLOCK_SKEW'
  | 'NOISY_SENSOR'
  | 'CALIBRATION_ISSUE'
  | 'CONFLICTING_SENSOR';

export type ThermalRiskCategory = 
  | 'Missing'
  | 'Unknown'
  | 'Potential exposure'
  | 'Confirmed exposure';

export interface Gap {
  id: string;
  shipmentId: string;
  sensorId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  gapType: GapType;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  cause: string;
  lastKnownTemperature: number;
  precedingTrend: 'Stable' | 'Warming' | 'Cooling';
  followingTrend: 'Stable' | 'Warming' | 'Cooling';
  correlatedSensors: string[];
  confidence: number;
  thermalRisk: ThermalRiskCategory;
  legName: LegType;

  // Legacy/Compatibility fields
  startTemp: number;
  endTemp: number;
  status: StatusCategory;
  confidenceScore: number;
  locationContext: string;
  probableCause: string;
  thermalIntegrityRisk: 'Safe' | 'Excursion Warning' | 'Spoil Risk';
}

export type ConfidenceLevel = 'Very High' | 'High' | 'Medium' | 'Low' | 'Very Low';

export type ReconstructionMethod = 
  | 'INTERPOLATION' 
  | 'TREND_ESTIMATION' 
  | 'CORRELATED_SENSOR' 
  | 'JOURNEY_CONTEXT' 
  | 'CONFLICT_WIDENED' 
  | 'UNRECOVERABLE';

export type ReconstructionStatus = 'OBSERVED' | 'RECONSTRUCTED' | 'UNKNOWN';

export interface EvidenceItem {
  factor: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface ConfidenceFactorBreakdown {
  base: number;
  durationPenalty: number;
  calibrationPenalty: number;
  conflictPenalty: number;
  signalPenalty: number;
  correlationBonus: number;
  contextBonus: number;
}

export interface ReconstructionPointResult {
  timestamp: string;
  estimatedTemperature: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  confidence: number; // 0.0 to 1.0
  confidenceLevel: ConfidenceLevel;
  status: ReconstructionStatus;
  method: ReconstructionMethod;
  evidence: EvidenceItem[];
  uncertaintyReason: string;
  confidenceFactors: ConfidenceFactorBreakdown;
  gapId?: string;
  shipmentId?: string;
  sensorId?: string;
}

export interface ShipmentReconstructionResult {
  shipmentId: string;
  points: ReconstructionPointResult[];
  reconstructedGapsCount: number;
  unrecoverableGapsCount: number;
  averageConfidence: number;
}

export type LogisticsEventType = 
  | 'Door Open' 
  | 'Door Close' 
  | 'Handover Scan' 
  | 'Geofence Arrival' 
  | 'Geofence Departure' 
  | 'Network Lost' 
  | 'Network Restored';

export interface TimelineEventMarker {
  id: string;
  timestamp: string;
  type: LogisticsEventType;
  location: string;
  description: string;
  impactSeverity: 'Info' | 'Warning' | 'Critical';
}

export interface UncertainPeriodItem {
  id: string;
  start: string;
  end: string;
  durationMinutes: number;
  journeyStage: LegType;
  reason: string;
  confidence: number;
  recommendedHandling: string;
}

export interface ReconstructionPoint {
  timestamp: string;
  estimatedTemp: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface Reconstruction {
  id: string;
  gapId: string;
  shipmentId: string;
  algorithm: 'Thermal Inertia Kinematics' | 'Kalman-LSTM Fusion' | 'Spatial Neighbor Interpolation';
  status: StatusCategory;
  confidenceScore: number;
  meanEstimatedTemp: number;
  peakEstimatedTemp: number;
  reconstructedPoints: ReconstructionPoint[];
  reconstructedAt: string;
  approvedBy?: string;
}

export interface HandoverEvent {
  id: string;
  shipmentId: string;
  timestamp: string;
  legFrom: LegType;
  legTo: LegType;
  handlerFrom: string;
  handlerTo: string;
  location: string;
  durationMinutes: number;
  ambientTemp: number;
  checkPassed: boolean;
  notes?: string;
}

export interface CalibrationRecord {
  id: string;
  sensorId: string;
  timestamp: string;
  technician: string;
  NISTTraceableId: string;
  varianceC: number; // e.g. +0.03 °C
  passed: boolean;
  notes?: string;
}

export type WorkerRole = 'Driver' | 'Dock Worker' | 'Warehouse Worker' | 'Supervisor';

export type WorkloadStatus = 'AVAILABLE' | 'NEAR_CAPACITY' | 'AT_CAPACITY' | 'OFF_SHIFT';

export interface Worker {
  id: string;
  name: string;
  role: WorkerRole | string;
  shift: string;
  currentTasks: number;
  completedTasks: number;
  workloadCapacity: number;
  hoursWorked: number;
  availability: boolean;
  status: WorkloadStatus;
  department?: string;
  location?: string;
  contact?: string;
  activeShipmentsCount?: number;
  assignedTaskIds?: string[];
}

export type AlertClassification = 
  | 'CONFIRMED_EXPOSURE'
  | 'POSSIBLE_EXPOSURE'
  | 'LOW_CONFIDENCE_ANOMALY'
  | 'NO_ALERT';

export type AlertSource = 'Observed' | 'Reconstructed' | 'Hybrid';

export interface Alert {
  id: string;
  shipmentId: string;
  sensorId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  maximumTemperature: number;
  threshold: number;
  confidence: number; // 0 to 100 percentage
  status: AlertClassification | 'Active' | 'Acknowledged' | 'Resolved';
  source: AlertSource;
  reason: string;
  recommendedAction: string;

  // Compatibility and display helper properties
  shipmentCode?: string;
  severity?: 'Critical' | 'Warning' | 'Info';
  title?: string;
  description?: string;
  timestamp?: string;
  triggerValue?: string;
  isFalseAlarmCandidate?: boolean;
}

export interface AlertConfig {
  temperatureThreshold: number; // e.g. 5.0 °C
  exposureDurationMinutes: number; // e.g. 20 minutes
  minConfidenceThreshold: number; // e.g. 75 %
  useShipmentTargetMax?: boolean;
  shipmentId?: string; // 'all' or specific shipment id
}

export interface ThresholdTradeoffPoint {
  threshold: number;
  falsePositives: number;
  falseNegatives: number;
  truePositives: number;
  trueNegatives: number;
  falsePositiveRate: number; // percentage 0 - 100
  falseNegativeRate: number; // percentage 0 - 100
  confirmedExposures: number;
  possibleExposures: number;
  lowConfidenceCount: number;
  totalAlerts: number;
}

export interface SensorReliabilityMetrics {
  sensorId: string;
  reliabilityScore: number; // 0.0 to 1.0
  calibrationFactor: number;
  batteryFactor: number;
  signalFactor: number;
  isReliable: boolean;
  notes: string;
}

export type StoreAndForwardState = 
  | 'CONNECTED'
  | 'NETWORK_OFFLINE'
  | 'BUFFERING_LOCALLY'
  | 'NETWORK_RESTORED'
  | 'SYNCING'
  | 'SYNC_COMPLETE';

export interface BufferedReading {
  id: string;
  sensorId: string;
  shipmentId: string;
  recordedTimestamp: string;
  temperature: number;
  groundTruthTemp: number;
  syncTimestamp?: string;
  isSynced: boolean;
}

export interface StoreAndForwardSession {
  sensorId: string;
  shipmentId: string;
  state: StoreAndForwardState;
  bufferedReadings: BufferedReading[];
  syncedReadings: SensorReading[];
  syncCount: number;
  syncLagSeconds: number; // delay in seconds
  lastSuccessfulSync: string | null;
  outageStartTime: string | null;
  networkRestoredTime: string | null;
  excursionDetectedDuringOutage: boolean;
  peakExcursionTemp: number | null;
}

export type FailureScenarioId = 
  | 'SCENARIO_1_TOTAL_DROPOUT'
  | 'SCENARIO_2_MISCALIBRATED_SENSOR'
  | 'SCENARIO_3_CONFLICTING_SENSORS'
  | 'SCENARIO_4_OUTAGE_EXCURSION';

export interface FailureScenarioReport {
  scenarioId: FailureScenarioId;
  scenarioTitle: string;
  expectedBehavior: string;
  actualBehavior: string;
  confidenceScore: number; // 0 to 100
  dataAvailability: string;
  riskInterpretation: string;
  metrics: Record<string, string | number>;
}

export type TaskType = 
  | 'Arrival verification'
  | 'Container inspection'
  | 'Temperature verification'
  | 'Documentation check'
  | 'Supervisor review';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TaskStatus = 'UNASSIGNED' | 'ASSIGNED' | 'QUEUED' | 'ESCALATED' | 'COMPLETED' | 'BLOCKED';

export interface WorkloadTask {
  id: string;
  type: TaskType;
  shipmentId: string;
  alertId?: string;
  priority: TaskPriority;
  createdAt: string;
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  assignedWorkerRole?: WorkerRole | string;
  status: TaskStatus;
  description: string;
  estimatedMinutes?: number;
  blockingReason?: string;
}

export type AssignmentResolution = 'ASSIGNED' | 'BLOCKED_CAPACITY' | 'QUEUED' | 'ESCALATED' | 'DEFERRED';

export interface AssignmentAuditRecord {
  id: string;
  taskId: string;
  alertId?: string;
  workerId?: string;
  workerName?: string;
  workerRole?: WorkerRole | string;
  assignmentTime: string;
  reason: string;
  workloadBefore: number; // percentage (0 - 100)
  workloadAfter: number;  // percentage (0 - 100)
  assignmentStatus: AssignmentResolution;
  safeguardTriggered?: boolean;
}

export interface WorkloadSummaryMetrics {
  totalWorkers: number;
  availableWorkers: number;
  nearCapacityWorkers: number;
  atCapacityWorkers: number;
  offShiftWorkers: number;
  queuedTasksCount: number;
  escalatedTasksCount: number;
}

// ==========================================
// Before-vs-After Comparison Types
// ==========================================

export interface ProcessMetrics {
  name: string;
  mae: number;
  rmse: number;
  uncertainExposureMinutes: number;
  riskWeightedExposure: number;
  falseAlerts: number;
  confirmedAlerts: number;
  possibleAlerts: number;
  unknownMinutes: number;
  averageConfidence: number; // 0 to 100 percentage
  workerVerificationTasks: number;
}

export type GapLengthCategory = '0–10 min' | '10–30 min' | '30–60 min' | '60+ min';

export interface GapLengthErrorItem {
  category: GapLengthCategory;
  sampleCount: number;
  baselineMae: number;
  proposedMae: number;
  baselineRmse: number;
  proposedRmse: number;
}

export interface SubgroupErrorItem {
  groupName: string;
  baselineMae: number;
  proposedMae: number;
  sampleCount: number;
  description: string;
}

export interface ConfidenceCoverageResult {
  expectedCoverage: number; // e.g. 90.0%
  observedCoverage: number; // calculated percentage
  totalPointsEvaluated: number;
  pointsWithinInterval: number;
  pointsOutsideInterval: number;
}

export interface ErrorConfidencePoint {
  id: string;
  timestamp: string;
  confidence: number; // 0 to 100%
  absoluteError: number; // °C
  groundTruthTemp: number;
  estimatedTemp: number;
  gapDurationMinutes: number;
}

export interface ModelWeaknessItem {
  weakness: string;
  condition: string;
  description: string;
  baselineMae: number;
  proposedMae: number;
  mitigationRecommendation: string;
}

export interface BeforeAfterExperimentReport {
  seed: number;
  executionTimestamp: string;
  totalShipments: number;
  totalGaps: number;
  totalGapMinutes: number;
  reconstructedMinutes: number;
  unknownMinutes: number;
  baseline: ProcessMetrics;
  proposed: ProcessMetrics;
  confidenceCoverage: ConfidenceCoverageResult;
  gapLengthErrors: GapLengthErrorItem[];
  subgroupErrors: {
    calibration: SubgroupErrorItem[];
    neighborSensors: SubgroupErrorItem[];
    thermalDynamics: SubgroupErrorItem[];
    sensorConflict: SubgroupErrorItem[];
  };
  errorVsConfidenceScatter: ErrorConfidencePoint[];
  weaknessesAndLimitations: ModelWeaknessItem[];
}

// ==========================================
// GOVERNANCE: RISK, ASSUMPTIONS, ARCHITECTURE & SCHEMAS
// ==========================================

export type RiskLikelihood = 'Low' | 'Medium' | 'High';
export type RiskImpact = 'Low' | 'Medium' | 'High' | 'Critical';
export type ResidualRisk = 'Low' | 'Medium' | 'High';

export interface RiskItem {
  id: string;
  risk: string;
  category: 'Algorithmic' | 'Hardware' | 'Operational' | 'Environmental' | 'Data Integrity' | 'Simulation';
  likelihood: RiskLikelihood;
  impact: RiskImpact;
  mitigation: string;
  detectionMethod: string;
  residualRisk: ResidualRisk;
  owner: string;
  regulatoryStandard?: string;
}

export interface AssumptionItem {
  id: string;
  category: 'Sensor' | 'Network' | 'Calibration' | 'Journey' | 'Environmental' | 'Worker Workload' | 'Simulation';
  title: string;
  statement: string;
  physicalBasis: string;
  boundaryConditions: string;
  failureConsequence: string;
}

export interface ArchitectureNode {
  id: string;
  stepNumber: number;
  layer: string;
  name: string;
  componentPath: string;
  inputs: string[];
  outputs: string[];
  responsibilities: string[];
  designPatterns: string[];
}

export interface DataSchemaField {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface DataSchemaDoc {
  id: string;
  name: string;
  description: string;
  typeScriptDefinition: string;
  jsonExample: string;
  fields: DataSchemaField[];
}

export interface UserGuideStep {
  stepNumber: number;
  title: string;
  instruction: string;
  tip?: string;
  iconName?: string;
}

export interface UserGuideSection {
  id: string;
  title: string;
  targetRole: 'QA Officer' | 'Logistics Operator' | 'Supervisor' | 'All';
  description: string;
  steps: UserGuideStep[];
}

export interface MilestoneStatusItem {
  milestone: number;
  name: string;
  status: 'Complete' | 'In Progress' | 'Planned';
  completionPercentage: number;
  testCount: number;
  deliverables: string[];
}





