import React from 'react';
import { PageKey } from '../components/Sidebar';
import { 
  Sparkles, 
  Bell, 
  SplitSquareVertical, 
  Users, 
  FlaskConical, 
  ShieldAlert, 
  FileText, 
  Cpu, 
  BookOpen,
  ArrowRight
} from 'lucide-react';

interface PlaceholderPageProps {
  pageKey: PageKey;
  onNavigate: (page: PageKey) => void;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ pageKey, onNavigate }) => {
  const getModuleMeta = (key: PageKey) => {
    switch (key) {
      case 'reconstruction':
        return {
          title: 'Sensor-Gap Reconstruction Engine',
          module: 'Milestone 2: Physics-Informed ML Engine',
          icon: Sparkles,
          description: 'Thermal inertia kinematics, Kalman-LSTM sensor fusion, and spatial neighbor interpolation algorithms to mathematically reconstruct missing temperature profiles across carrier dropouts.',
          plannedFeatures: [
            'Physics-informed thermal inertia curve fitting',
            'Multi-sensor spatial neighbor weighting',
            'Confidence interval boundary modeling (95% CI)',
            'Interactive gap curve comparison tool'
          ],
        };
      case 'alerts':
        return {
          title: 'Alert & Excursion Dispatch Center',
          module: 'Milestone 2: Real-Time Escalation',
          icon: Bell,
          description: 'Automated alert trigger matrix, SMS/Email dispatching to cold-chain logistics officers, and SLA compliance escalation for temperature excursions.',
          plannedFeatures: [
            'Custom thermal threshold rules',
            'Automated SMS/WhatsApp escalation to QA drivers',
            'Excursion severity scoring matrix',
            'Regulatory compliance incident export'
          ],
        };
      case 'before-after':
        return {
          title: 'Before vs After Thermal Profile Compare',
          module: 'Milestone 2: Impact Analysis',
          icon: SplitSquareVertical,
          description: 'Side-by-side comparison of raw incomplete telemetry traces against reconstructed continuous thermal profiles for regulatory auditors and insurance claims.',
          plannedFeatures: [
            'Dual-axis curve overlay comparator',
            'Degradation risk metric delta',
            'Carrier liability assessment score',
            'NIST audit trail certificate export'
          ],
        };
      case 'workload':
        return {
          title: 'Logistics Officer & QA Workload Management',
          module: 'Milestone 3: Operations & Dispatch',
          icon: Users,
          description: 'Task assignment and workload distribution for port inspectors, cold-store technicians, and quality control personnel across export hubs.',
          plannedFeatures: [
            'Inspector shift & location dispatcher',
            'Active shipment capacity tracking per officer',
            'QA resolution timestamp tracking',
            'Inspection task priority queue'
          ],
        };
      case 'experiments':
        return {
          title: 'Reconstruction Algorithm Sandbox & Experiments',
          module: 'Milestone 3: Data Science Benchmarking',
          icon: FlaskConical,
          description: 'Benchmarking environment to compare different ML reconstruction algorithms (Random Forest, LSTM, Spline Interpolation, Thermal Inertia) on historical synthetic sensor dropouts.',
          plannedFeatures: [
            'Synthetic gap injection engine',
            'RMSE and MAE error matrix benchmarking',
            'Algorithm hyperparameter tuning',
            'Cross-carrier model validation'
          ],
        };
      case 'risk-register':
        return {
          title: 'Enterprise Cold-Chain Risk Register',
          module: 'Milestone 3: Compliance & Risk',
          icon: ShieldAlert,
          description: 'Systemic risk scoring for export routes, carrier reliability ratings, seasonal ambient temperature risks, and packaging thermal degradation ratings.',
          plannedFeatures: [
            'Carrier temperature compliance scorecard',
            'Route risk heatmaps (Air vs Sea vs Truck)',
            'Packaging insulation insulation-R rating simulator',
            'Spoilage insurance financial risk estimation'
          ],
        };
      case 'assumptions':
        return {
          title: 'Thermal & Physics Model Assumptions',
          module: 'Documentation Module',
          icon: FileText,
          description: 'Formal documentation of thermal physics assumptions (Newtonian cooling rates, latent heat of fusion during fish freezing, packaging boundary conditions).',
          plannedFeatures: [
            'Newtonian cooling coefficient specs',
            'Seafood specific heat capacities (Fresh vs Frozen)',
            'Sensory degradation Arrhenius equation parameters',
            'Packaging insulation thermal conductivity metrics'
          ],
        };
      case 'architecture':
        return {
          title: 'System Architecture & Data Pipelines',
          module: 'Documentation Module',
          icon: Cpu,
          description: 'Technical design specification showing IoT gateway MQTT ingest, event bus streaming, reconstruction microservices, and database schema.',
          plannedFeatures: [
            'IoT MQTT/HTTP gateway architecture',
            'TimescaleDB / InfluxDB telemetry schema',
            'Microservice API contract endpoints',
            'Edge deployment on BLE gateway loggers'
          ],
        };
      case 'user-guide':
      default:
        return {
          title: 'User Guide & Operating Manual',
          module: 'Documentation Module',
          icon: BookOpen,
          description: 'Step-by-step operating guide for logistics managers, export QA officers, and customs compliance auditors.',
          plannedFeatures: [
            'Quick start guide for new shipments',
            'How to interpret confidence scores (>85%)',
            'Generating regulatory certificates for EU/FDA',
            'Troubleshooting offline sensor nodes'
          ],
        };
    }
  };

  const meta = getModuleMeta(pageKey);
  const Icon = meta.icon;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="glass-panel p-8 text-center space-y-4 max-w-3xl mx-auto my-8 border-cyan-900/40">
        <div className="w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center mx-auto text-cyan-400 shadow-xl">
          <Icon className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold bg-purple-950 text-purple-300 border border-purple-800">
            {meta.module}
          </span>
          <h2 className="text-2xl font-bold text-slate-100">{meta.title}</h2>
          <p className="text-xs text-slate-300 max-w-xl mx-auto leading-relaxed">
            {meta.description}
          </p>
        </div>

        <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 text-left space-y-2 mt-6">
          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
            Planned Features Coming in Next Milestone:
          </h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
            {meta.plannedFeatures.map((feat, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-4 flex justify-center gap-3">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors flex items-center gap-2"
          >
            <span>Return to Executive Dashboard</span>
            <ArrowRight className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
