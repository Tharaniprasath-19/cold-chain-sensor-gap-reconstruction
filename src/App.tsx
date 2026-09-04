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
            alerts={mockAlerts}
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
      case 'before-after':
      case 'workload':
      case 'experiments':
      case 'risk-register':
      case 'assumptions':
      case 'architecture':
      case 'user-guide':
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
        activeAlertsCount={mockAlerts.filter(a => a.status === 'Active').length}
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
