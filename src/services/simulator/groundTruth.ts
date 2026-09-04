import { LegType } from '../../types';

// Seedable PRNG (Mulberry32) for 100% reproducible deterministic simulations
export function createPRNG(seed: number) {
  let s = seed >>> 0;
  return function random(): number {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface LegInfo {
  name: LegType;
  durationMinutes: number;
  baseTemp: number; // °C
  tempVariance: number; // °C
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

export interface SimulatedRoute {
  shipmentId: string;
  code: string;
  product: string;
  targetTempMin: number;
  targetTempMax: number;
  legs: LegInfo[];
}

export function generateGroundTruthTemperature(
  progressRatio: number, // 0.0 to 1.0 across the leg
  leg: LegInfo,
  _overallProgress: number, // 0.0 to 1.0 across the entire shipment
  rng: () => number
): number {
  const { baseTemp, tempVariance } = leg;

  // Reefer compressor cycle (sinusoidal temperature wave)
  const reeferCycle = Math.sin(progressRatio * Math.PI * 16) * 0.4;

  // Ambient noise perturbation
  const noise = (rng() - 0.5) * tempVariance;

  let thermalSpike = 0;

  // Realistic thermal perturbations during handover events
  if (leg.name === 'Port Cargo Staging' && progressRatio > 0.4 && progressRatio < 0.6) {
    // Port gate waiting / tarmac sun exposure spike
    thermalSpike = 2.8 * Math.sin((progressRatio - 0.4) * 5 * Math.PI);
  } else if (leg.name === 'Customs Inspection' && progressRatio > 0.3 && progressRatio < 0.7) {
    // Customs inspection door open / container seal break
    thermalSpike = 3.5 * Math.sin((progressRatio - 0.3) * 2.5 * Math.PI);
  } else if (progressRatio < 0.05 || progressRatio > 0.95) {
    // Cargo loading/unloading door open pulse
    thermalSpike = 1.2 * (rng() > 0.5 ? 1 : 0.5);
  }

  const trueTemp = baseTemp + reeferCycle + noise + thermalSpike;
  return Number(trueTemp.toFixed(2));
}
