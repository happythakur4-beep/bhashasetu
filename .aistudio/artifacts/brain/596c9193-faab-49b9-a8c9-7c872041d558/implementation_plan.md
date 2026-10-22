# Tactical Mesh Signal Map & Node Distance Visualizer

An interactive radar and spatial topology visualizer for the Mandali Walkie-Talkie app that projects active mesh network nodes, signal attenuation (RSSI / SNR), relative distance estimations, node health, and hop vectors in real time.

> [!IMPORTANT]
> **Confirmed Decision**: The user selected option 1 — **Tactical Mesh Signal Map & Node Distance Visualizer** — as the next feature enhancement to implement.

---

### 1. Overview & Core Concept

- **What It Does**: Renders an interactive, polar radar canvas and node topology map inside `WalkieTalkieView` (accessible via a dedicated top-bar mode tab or collapsible radar drawer). It displays all active peers on the mesh network with real-time distance estimations (meters/km), signal attenuation dBm, packet hop routes, latency jitter, and node battery/role indicators.
- **Target Audience / Persona**: Tactical teams, field operators, emergency responders, and language-learning expedition groups communicating in off-grid environments.
- **Key Value**: Provides instant situational awareness of peer proximity, mesh link health, audio packet loss risk, and path redundancy without requiring cellular coverage or internet connection.

---

### 2. User Experience & Visual Design

- **Polar Radar & Topology Stage**:
  - Rotating radar sweep line over radial range rings (25m, 50m, 100m, 250m) with distance coordinate overlays.
  - Distinctive node blips for self (center baseline) and connected peer nodes positioned by calculated distance and relative azimuth angle.
  - Interactive click on any node blip to open a **Peer Telemetry HUD drawer** (showing dBm, estimated distance, packets sent/received, Opus compression bitrate, ping latency, and direct PTT broadcast shortcut).
  - Hop line vectors connecting multi-hop mesh paths with animated pulse particles indicating packet flow.

- **Visual Identity & Theme Integration**:
  - **Color Palette**: Dark space obsidian field (`#090D16`), slate grid lines (`#1E293B`), phosphor cyan active nodes (`#06B6D4`), signal amber for weak links (`#F59E0B`), and emerald for strong links (`#10B981`). Automatically respects the app's light/dark mode posture.
  - **Typography**: Clean technical typography pairing `Plus Jakarta Sans` for labels and `JetBrains Mono` / `tabular-nums` for distance coordinates, RSSI dBm values, and latency metrics.
  - **Interactive Controls**:
    - Range zoom control (25m / 50m / 100m / 250m / Auto-fit).
    - Map mode toggle: **Polar Radar View** vs. **Force-Directed Topology View**.
    - Ping All Nodes trigger with acoustic feedback ping sound effect.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Distance Estimation Algorithm**:
  - *Chosen Approach*: Simulated Free-Space Path Loss (FSPL) and Round-Trip Time (RTT) delay estimation calibrated against packet RSSI and peer telemetry.
  - *Why*: Web browsers do not expose raw Bluetooth/Wi-Fi Direct hardware distance measurements without native mobile APIs; FSPL + RTT provides a realistic and responsive distance approximation for peer mesh nodes in web applications.

- **Decision 2: Render Engine Choice**:
  - *Chosen Approach*: High-performance HTML5 2D Canvas with requestAnimationFrame sweep loops for smooth 60fps rendering, combined with crisp React overlay HUD panels.
  - *Why*: Canvas 2D is lightweight, dependency-free, zero-latency, works flawlessly across mobile and desktop browsers, and avoids heavy WebGL/Three.js bundle overhead.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        WalkieTalkieView Canvas                         │
├──────────────────────────────────────┬─────────────────────────────────┤
│    Polar Radar Canvas (2D Engine)    │     Peer Telemetry Inspector    │
│  ┌────────────────────────────────┐  │  ┌───────────────────────────┐  │
│  │ Radial Rings (25m - 250m)      │  │  │ Selected Node: Peer-Alpha │  │
│  │ Rotating Sweep Line (60fps)    │  │  │ Distance: 34.2 m          │  │
│  │ Node Blips & Hop Vectors       │  │  │ RSSI: -68 dBm (Strong)    │  │
│  └────────────────────────────────┘  │  │ Latency: 18ms | Jitter 2ms│  │
│                                      │  └───────────────────────────┘  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
       ┌───────────────────────┐       ┌───────────────────────┐
       │ meshNetwork.ts        │       │ peerMesh.ts           │
       │ (Packet telemetry,    │       │ (WebRTC DataChannel   │
       │  hop counts, nodes)   │       │  RTT / RSSI signals)  │
       └───────────────────────┘       └───────────────────────┘
```

- **New Files / Components to Create**:
  1. `src/services/meshTopologyService.ts` — Manages node telemetry tracking, RSSI signal estimation, distance calculation math, and mesh path topology data.
  2. `src/components/TacticalMeshMap.tsx` — Radar and force-directed topology canvas renderer with interactive node selection, zoom controls, and range overlays.
  3. Integration into `src/components/WalkieTalkieView.tsx` — Dedicated view mode toggle button (`Radar Map`) and quick stats badge in the walkie-talkie header.

---

### 5. Verification Plan

- Run `compile_applet` and `lint_applet` to ensure typescript compilation passes without errors.
- Test responsive rendering across mobile and desktop viewport sizes.
- Verify interactive node selection, range zoom controls, topology mode toggles, and direct PTT broadcast shortcuts from the telemetry drawer.
