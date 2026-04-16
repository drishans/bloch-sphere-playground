# Bloch Sphere Playground

An interactive quantum computing visualizer that renders qubit states on a 3D Bloch sphere in real time. Apply gates, create entanglement, run circuits, and explore quantum mechanics visually.

## Versions

This repo contains two versions:

- **`bloch-sphere-playground.html`** — The original single-file WebGL version. Open directly in any browser, no build step needed.
- **`bloch-v2/`** — A full rewrite using WebGPU, TypeScript, and Vite with a modular architecture, live shader editing, and a comprehensive test suite.

---

## bloch-v2 (Current)

### Tech Stack

- **WebGPU** with WGSL shaders (Blinn-Phong lit sphere, flat-color lines, dashed grid)
- **TypeScript** with strict mode
- **Vite** for dev server and production builds
- **Vitest** for unit testing (163 tests across 6 test files)

### Quick Start

```bash
cd bloch-v2
npm install
npm run dev      # dev server at localhost:5173
npm run build    # production build to dist/
npm test         # run all tests
```

Requires Chrome 113+, Edge 113+, or another browser with WebGPU support.

### Layout

Three-panel layout inspired by the WebGPU Samples site:

- **Left** — 3D Bloch sphere canvas (drag to rotate, scroll to zoom)
- **Right** — Controls panel with gates, qubit tabs, probabilities, density matrix, circuit diagram, measurement, and more
- **Bottom** — Live WGSL code editor with syntax highlighting. Edit sphere, line, or grid shaders and recompile in real time.

### Project Structure

```
bloch-v2/
  index.html                 # 3-panel layout shell
  package.json               # vite + vitest + @webgpu/types
  tsconfig.json
  vite.config.ts
  src/
    main.ts                  # Entry point — wires everything together
    styles.css               # Dark theme, all UI components
    vite-env.d.ts            # .wgsl?raw module declarations
    engine/
      complex.ts             # Complex number class + formatting
      gates.ts               # Gate matrices (2x2, 4x4) + rotation gates
      quantum-state.ts       # Multi-qubit state engine (2^n amplitudes)
      __tests__/
        complex.test.ts      # 32 tests
        gates.test.ts        # 38 tests
        quantum-state.test.ts # 53 tests
    shaders/
      sphere.wgsl            # Blinn-Phong lit mesh shader
      line.wgsl              # Flat color line/point shader
      grid.wgsl              # Dashed grid circle shader
    renderer/
      webgpu-renderer.ts     # GPU init, pipelines, per-frame rendering
    ui/
      circuit-diagram.ts     # Canvas 2D circuit visualization
      histogram.ts           # Measurement outcome bar chart
      code-editor.ts         # WGSL editor with syntax highlighting
    utils/
      math.ts                # mat4 operations, 3D→2D projection
      geometry.ts            # Sphere, circle, arrow mesh generation
      qasm.ts                # OpenQASM 2.0 export
      __tests__/
        math.test.ts         # 16 tests
        geometry.test.ts     # 16 tests
        qasm.test.ts         # 8 tests
    recipes/
      index.ts               # 7 recipes, 6 quiz challenges, 8 tutorial steps
```

### Features

**Quantum Engine** — Full 2^n state vector supporting real entanglement (up to 4 qubits). Individual Bloch vectors computed via partial trace of the reduced density matrix.

**Gates** — X, Y, Z, H, S, S†, T, T† single-qubit gates. CNOT, CZ, SWAP, CH two-qubit gates. Arbitrary rotation gates Rx, Ry, Rz, Rn with adjustable angle and custom axis.

**Visualization** — 3D Bloch sphere with trajectory trails, probability bars, reduced density matrix display, expectation values (Pauli X/Y/Z), fidelity calculator against target states, and a live circuit diagram.

**Measurement** — Collapse in Z, X, or Y basis. Monte Carlo histogram over configurable shot count without state collapse.

**Recipes** — Pre-built circuits: Bell states (Φ⁺, Ψ⁺), GHZ state, uniform superposition, phase kickback, teleportation setup, SWAP test.

**Quiz Mode** — Challenges to reach target states (|1⟩, |+⟩, |−⟩, |+i⟩, |−i⟩) with fidelity tracking.

**Tutorial** — 8-step interactive walkthrough covering the Bloch sphere, gates, superposition, rotation, measurement, and entanglement.

**Code Editor** — Live WGSL shader editing with syntax highlighting for keywords, types, builtins, decorators, and comments. Tab between sphere/line/grid shaders. Recompile and see changes instantly.

**Export** — OpenQASM 2.0 circuit export with copy to clipboard. State save/load via localStorage. Share via URL hash encoding.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| X / Y / Z / H / S / T | Apply gate |
| 1–4 | Select qubit |
| M | Measure (Z basis) |
| R | Reset state |
| Ctrl+Z | Undo last gate |
| Esc | Close modal/tutorial |

### Running Tests

```bash
npm test              # single run
npm run test:watch    # watch mode
```

The test suite covers complex arithmetic, gate unitarity, quantum state operations (entanglement, measurement, Bloch vectors, partial trace, serialization), matrix math, geometry generation, and QASM export.

---

## Limitations

- 4 qubit maximum (16-dimensional state vector)
- WebGPU required — falls back to an error message in unsupported browsers
- Custom axis rotation (Rn) exported as comments in QASM (no standard QASM equivalent)
- Share URLs grow with state vector size
