# ColdChain Insight 🐟❄️
### Cold-Chain Sensor-Gap Reconstruction & Confidence Tool

> A real-world logistics analytics platform engineered for seafood exporters to continuously monitor thermal compliance, simulate sensor telemetry dropouts, automatically detect blackout patterns, reconstruct missing temperature profiles with transparent confidence modeling, and evaluate risk across global transport legs.

---

## 🎯 Project Purpose

Seafood exports (e.g., Sashimi-grade Yellowfin Tuna, Atlantic Salmon, Live Crustaceans) require strict uninterrupted cold-chain thermal boundaries (-2°C to +2°C for fresh, -20°C for deep-frozen). During multimodal handovers—such as tarmac transfers, customs bonded inspections, or metal-shielded container yards—wireless IoT sensor logs frequently suffer communication blackouts (gaps).

**ColdChain Insight** bridges these telemetry blind spots by:
1. **Deterministic Telemetry Simulation (Phase 2)**: Generating reproducible multi-sensor telemetry datasets with seedable PRNG (`seed = 42`) and internal ground truth temperature tracking.
2. **Automated Gap Detection Engine (Phase 3)**: Automatically identifying 9 distinct anomaly & blackout patterns (missing pings, short/long gaps, entire-leg dropouts, network outages, low signal, clock skew, noisy spikes, calibration drift, conflicting sensors).
3. **Layered 6-Level Reconstruction & Confidence Engine (Phase 4)**: Estimating missing temperature profiles while explicitly communicating 95% confidence bounds (`lowerBound`, `upperBound`) and evidence factor breakdowns.
4. **Hard Constraint on Uncertainty**: Reconstructed values are **never** presented as equivalent to observed values. Completely unrecoverable periods are explicitly marked as `UNKNOWN` / `UNRECOVERABLE` without fake temperature interpolation.

---

## 🛠️ Technology Stack

- **Frontend Framework**: React 18 with TypeScript 5
- **Build Tool & Dev Server**: Vite 5
- **Styling**: Tailwind CSS (Enterprise Dark/Slate Logistics Theme)
- **Component System**: Modular UI architecture with Lucide Icons (`lucide-react`)
- **Data Visualizations**: Recharts (`recharts` interactive Area, Line, and Confidence Band charts)
- **Simulation Engine**: Seedable Mulberry32 PRNG with physical thermal kinetics models
- **Detection Engine**: Automated 9-pattern time-series anomaly detection algorithms
- **Reconstruction Engine**: Layered 6-level thermal solver with transparent confidence model & 19/19 passing unit tests (`npx tsx`)
- **Deployment**: Fully client-side SPA (runs locally without third-party paid API dependencies)

---

## 🔬 Phase 4: Cold-Chain Gap Reconstruction Strategy

The reconstruction engine applies a 6-level layered strategy:

| Level | Condition | Reconstruction Method | Confidence Range | Uncertainty Bounds |
| :--- | :--- | :--- | :--- | :--- |
| **LEVEL 1** | Short gap (<15m) + stable readings | `INTERPOLATION` | 90–100% (Very High) | Tight (±0.3°C) |
| **LEVEL 2** | Short/medium gap (15-45m) + clear trend | `TREND_ESTIMATION` | 75–89% (High) | Medium (±0.8°C) |
| **LEVEL 3** | Missing sensor + correlated neighbor | `CORRELATED_SENSOR` | 75–90% (High/Very High) | Medium (±0.6°C) |
| **LEVEL 4** | Dead sensor (>60m) / Journey context | `JOURNEY_CONTEXT` | 30–60% (Low/Medium) | Widened (±1.8°C to ±2.5°C) |
| **LEVEL 5** | Conflicting signals (>2.5°C diff) | `CONFLICT_WIDENED` | 20–50% (Low/Medium) | Widened (±3.2°C) |
| **LEVEL 6** | No supporting evidence / total blackout | `UNRECOVERABLE` | 0% (Very Low) | `null` (Marked `UNKNOWN`) |

### Transparent Confidence Calculation Model:
```ts
confidence = Math.max(0, Math.min(1.0, 
  baseConfidence
  - durationPenalty
  - calibrationPenalty
  - conflictPenalty
  - signalPenalty
  + correlationBonus
  + contextBonus
));
```

### Confidence Levels:
- **90–100%**: `Very High`
- **75–89%**: `High`
- **50–74%**: `Medium`
- **25–49%**: `Low`
- **0–24%**: `Very Low`

---

## 🧪 Unit Tests Execution

To run the automated 19-test suite for the reconstruction engine:
```bash
cmd /c npx tsx src/services/reconstruction/__tests__/reconstructionEngine.test.ts
```
Expected output:
```
🧪 Running Reconstruction Engine Unit Tests...
  ✅ PASS: Test 1: Status is RECONSTRUCTED
  ✅ PASS: Test 1: Method is INTERPOLATION
  ✅ PASS: Test 1: Interpolated temp is 1.1°C
  ✅ PASS: Test 1: Confidence is Very High (>= 0.90)
  ✅ PASS: Test 2: Method is TREND_ESTIMATION
  ✅ PASS: Test 2: Confidence is High (0.70 - 0.89)
  ✅ PASS: Test 3: Method is JOURNEY_CONTEXT
  ✅ PASS: Test 3: Reduced confidence for long 180m gap
  ✅ PASS: Test 3: Widened uncertainty bounds (>= 3.0°C)
  ✅ PASS: Test 4: Dead sensor yields RECONSTRUCTED with reduced confidence
  ✅ PASS: Test 4: Dead sensor confidence < 0.60
  ✅ PASS: Test 5: Calibration factor tracked in breakdown
  ✅ PASS: Test 6: Method is CONFLICT_WIDENED
  ✅ PASS: Test 6: Conflict penalty applied (> 0)
  ✅ PASS: Test 6: Uncertainty bounds widened significantly
  ✅ PASS: Test 7: Status is UNKNOWN for unrecoverable period
  ✅ PASS: Test 7: Method is UNRECOVERABLE
  ✅ PASS: Test 7: estimatedTemperature is null (no fake temp!)
  ✅ PASS: Test 7: Confidence is 0.0

🎉 Results: 19/19 unit tests passed cleanly.
```

---

## 🚀 Local Run Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- `npm` (comes with Node.js)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000` to interact with the application shell.

### 3. Type Checking & Production Build
```bash
# Verify TypeScript strict typing
npm run typecheck

# Build production bundle
npm run build
```

---

## 📊 Current Implementation Status

| Page View / Module | Status | Key Features |
| :--- | :--- | :--- |
| **1. Executive Dashboard** | ✅ **Phase 5 Complete** | Dynamic 6 KPI Cards calculated from live simulation, Telemetry Stream Chart, Fleet Overview Table, Recent Events Panel |
| **2. Shipments** | ✅ **Complete** | Interactive Export Directory, Route Filters (Air, Ocean, Customs), Search & Status Pills |
| **3. Shipment Details** | ✅ **Phase 5 Complete** | Interactive Dual-Line Confidence Timeline (Observed vs Reconstructed), 95% Confidence Band, Explicit UNKNOWN Gaps, Event & Stage Markers, 7 Summary Cards, Confidence Summary Panel, Uncertain Periods QA Table |
| **4. Sensor Monitoring** | ✅ **Complete** | Fleet node inventory (IoT, BLE, Satellite, Probes), Battery/RSSI stats, Calibration logs |
| **5. Gap Analysis** | ✅ **Complete** | 6 KPI Cards, 9 Gap Types, Thermal Risk Classifier (`Missing`, `Unknown`, `Potential`, `Confirmed`), Visual Telemetry Timeline, 6-Stage Journey Bar, Inspector Drawer |
| **6. Data Preview & Simulator** | ✅ **Complete** | Interactive Simulation Controls, PRNG Seed = 42 generator, Ground Truth Inspector, Status badges (`Observed`, `Dropped`, `Buffered`, `Unknown`) |
| **7. Reconstruction Engine** | ✅ **Phase 4 Complete** | Layered 6-Level Solver, Shaded Uncertainty Bands, "Why was this value reconstructed?" Inspector Modal, Evidence Factor Breakdown, 19/19 Unit Tests Passing |
| **8. Alerts** | ⏳ Optional | Automated excursion notification & escalation dispatch center |
| **9. Before vs After** | ⏳ Optional | Dual-axis telemetry comparator (Raw vs Restored) |
| **10. Workload** | ⏳ Optional | Inspector shift dispatch & QA workload manager |
| **11. Experiments** | ⏳ Optional | Algorithm benchmarking sandbox (RMSE & MAE metrics) |
| **12. Risk Register** | ⏳ Optional | Route & carrier reliability risk matrix |
| **13. Assumptions** | ⏳ Docs | Thermal physics equations & seafood heat capacity specs |
| **14. Architecture** | ⏳ Docs | System architecture, MQTT ingest, & microservice schema |
| **15. User Guide** | ⏳ Docs | Operating manual for QA officers & regulatory auditors |
