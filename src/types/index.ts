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

export interface Worker {
  id: string;
  name: string;
  role: string; // e.g. "Cold Chain Logistics Officer", "QA Specialist"
  department: string;
  location: string;
  contact: string;
  activeShipmentsCount: number;
}

export interface Alert {
  id: string;
  shipmentId: string;
  shipmentCode: string;
  sensorId?: string;
  severity: 'Critical' | 'Warning' | 'Info';
  title: string;
  description: string;
  timestamp: string;
  status: 'Active' | 'Acknowledged' | 'Resolved';
  triggerValue?: string;
}
