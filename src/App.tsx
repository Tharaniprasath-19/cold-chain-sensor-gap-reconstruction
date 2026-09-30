import { useState } from 'react';
import { Sidebar, PageKey } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { ShipmentsPage } from './pages/ShipmentsPage';
import { ShipmentDetailPage } from './pages/ShipmentDetailPage';
import { SensorMonitoringPage } from './pages/SensorMonitoringPage';
import { GapAnalysisPage } from './pages/GapAnalysisPage';
import { DataPreviewPage } from './pages/DataPreviewPage';
import { ReconstructionPage } from './pages/ReconstructionPage';
import { AlertsPage } from './pages/AlertsPage';
import { FailureCaseLabPage } from './pages/FailureCaseLabPage';
import { WorkloadPage } from './pages/WorkloadPage';
import { BeforeAfterPage } from './pages/BeforeAfterPage';
import { RiskRegisterPage } from './pages/RiskRegisterPage';
import { AssumptionsPage } from './pages/AssumptionsPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { UserGuidePage } from './pages/UserGuidePage';
import { ProjectStatusPage } from './pages/ProjectStatusPage';
import { evaluateFleetAlerts, DEFAULT_ALERT_CONFIG } from './services/alerts/alertEngine';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { 
  mockAlerts, 
  mockHandovers 
} from './data/mockData';
import { demoSimulationResult } from './data/simulated/demoDataset';
import { runShipmentSimulation, SimulationResult, DEFAULT_SIMULATION_CONFIG } from './services/simulator/shipmentSimulator';
import { detectGaps } from './services/detection/gapDetector';
import { SimulationConfig } from './types';

export function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');
  const [simulationResult, setSimulationResult] = useState<SimulationResult>(demoSimulationResult);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>(
    demoSimulationResult.shipments[0]?.id || 'shp-sim-101'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  const detectedGaps = detectGaps(
    simulationResult.readings,
    simulationResult.config?.pingIntervalMinutes || 5
  );

  // Compute live confidence-aware alerts for fleet overview
  const liveAlerts = evaluateFleetAlerts(
    simulationResult.readings,
    detectedGaps,
    simulationResult.shipments,
    simulationResult.sensors,
    DEFAULT_ALERT_CONFIG
  );
  const activeExposuresCount = liveAlerts.filter(a => a.status === 'CONFIRMED_EXPOSURE' || a.status === 'POSSIBLE_EXPOSURE').length;

  const handleNavigate = (page: PageKey) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateSimulation = (newConfig: SimulationConfig) => {
    const newResult = runShipmentSimulation(newConfig);
    setSimulationResult(newResult);
    if (newResult.shipments.length > 0) {
      setSelectedShipmentId(newResult.shipments[0].id);
    }
  };

  const handleResetSimulation = () => {
    const newResult = runShipmentSimulation(DEFAULT_SIMULATION_CONFIG);
    setSimulationResult(newResult);
    if (newResult.shipments.length > 0) {
      setSelectedShipmentId(newResult.shipments[0].id);
    }
  };

  const handleLoadDemoSimulation = () => {
    setSimulationResult(demoSimulationResult);
    if (demoSimulationResult.shipments.length > 0) {
      setSelectedShipmentId(demoSimulationResult.shipments[0].id);
    }
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage
            shipments={simulationResult.shipments}
            sensors={simulationResult.sensors}
            gaps={detectedGaps}
            alerts={liveAlerts.length > 0 ? liveAlerts : mockAlerts}
            readings={simulationResult.readings}
            onSelectShipment={setSelectedShipmentId}
            onNavigate={handleNavigate}
          />
        );
      case 'shipments':
        return (
          <ShipmentsPage
            shipments={simulationResult.shipments}
            onSelectShipment={setSelectedShipmentId}
            onNavigate={handleNavigate}
          />
        );
      case 'shipment-detail':
        return (
          <ShipmentDetailPage
            shipmentId={selectedShipmentId}
            shipments={simulationResult.shipments}
            sensors={simulationResult.sensors}
            gaps={detectedGaps}
            handovers={mockHandovers}
            readings={simulationResult.readings}
            onNavigate={handleNavigate}
          />
        );
      case 'sensors':
        return (
          <SensorMonitoringPage
            sensors={simulationResult.sensors}
            onSelectSensor={(id) => {
              const sns = simulationResult.sensors.find(s => s.id === id);
              if (sns?.currentShipmentId) {
                setSelectedShipmentId(sns.currentShipmentId);
                handleNavigate('shipment-detail');
              }
            }}
          />
        );
      case 'gap-analysis':
        return (
          <GapAnalysisPage
            gaps={detectedGaps}
            shipments={simulationResult.shipments}
            readings={simulationResult.readings}
            onSelectShipment={setSelectedShipmentId}
            onNavigate={handleNavigate}
          />
        );
      case 'data-preview':
        return (
          <DataPreviewPage
            simulationResult={simulationResult}
            onUpdateSimulation={handleUpdateSimulation}
            onResetSimulation={handleResetSimulation}
            onLoadDemoSimulation={handleLoadDemoSimulation}
          />
        );
      case 'reconstruction':
        return (
          <ReconstructionPage
            shipments={simulationResult.shipments}
            sensors={simulationResult.sensors}
            readings={simulationResult.readings}
            gaps={detectedGaps}
          />
        );
      case 'alerts':
        return (
          <AlertsPage
            shipments={simulationResult.shipments}
            sensors={simulationResult.sensors}
            readings={simulationResult.readings}
            gaps={detectedGaps}
            onSelectShipment={(id) => {
              setSelectedShipmentId(id);
              handleNavigate('shipment-detail');
            }}
          />
        );
      case 'failure-lab':
      case 'experiments':
        return <FailureCaseLabPage />;
      case 'workload':
        return (
          <WorkloadPage
            liveAlerts={liveAlerts}
            shipments={simulationResult.shipments}
          />
        );
      case 'before-after':
        return (
          <BeforeAfterPage
            shipments={simulationResult.shipments}
            sensors={simulationResult.sensors}
            readings={simulationResult.readings}
            gaps={detectedGaps}
          />
        );
      case 'risk-register':
        return <RiskRegisterPage />;
      case 'assumptions':
        return <AssumptionsPage />;
      case 'architecture':
        return <ArchitecturePage />;
      case 'user-guide':
        return <UserGuidePage onNavigate={handleNavigate} />;
      case 'project-status':
        return <ProjectStatusPage onNavigate={handleNavigate} />;
      default:
        return (
          <PlaceholderPage
            pageKey={currentPage}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Navigation Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        activeAlertsCount={activeExposuresCount > 0 ? activeExposuresCount : mockAlerts.filter(a => a.status === 'Active').length}
        gapCount={detectedGaps.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <Header
          shipments={simulationResult.shipments}
          selectedShipmentId={selectedShipmentId}
          onSelectShipment={(id) => {
            setSelectedShipmentId(id);
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6">
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  );
}
