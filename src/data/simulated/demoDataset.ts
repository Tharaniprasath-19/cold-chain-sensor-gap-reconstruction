import { runShipmentSimulation, SimulationResult, DEFAULT_SIMULATION_CONFIG } from '../../services/simulator/shipmentSimulator';

// Pre-generated benchmark dataset created with PRNG seed = 42
export const demoSimulationResult: SimulationResult = runShipmentSimulation(DEFAULT_SIMULATION_CONFIG);
