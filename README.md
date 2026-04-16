# Bloch Sphere Playground v2 — Wiki

## Overview

The Bloch Sphere Playground is an interactive quantum computing visualizer built as a single HTML file with WebGL. It lets you apply quantum gates to qubits and see the resulting state on a 3D Bloch sphere in real time.

Version 2 adds a full multi-qubit state engine with entanglement support, a circuit diagram, measurement histograms, a tutorial system, quizzes, and much more.

---

## Getting Started

Open `bloch-sphere-playground.html` in any modern browser (Chrome, Firefox, Edge, Safari). No installation or server required.

**First time?** Click the **Tutorial** button in the toolbar to walk through the basics in 8 steps.

---

## Features

### 1. Bloch Sphere Visualization

The 3D sphere shows the quantum state of the active qubit. The north pole represents |0>, the south pole represents |1>, and points on the equator represent superpositions.

**Controls:** Drag to rotate the view, scroll to zoom in/out. Touch gestures are supported on mobile.

The colored arrow shows the state vector. If the qubit is entangled, the arrow will be shorter than radius 1 (inside the sphere), indicating a mixed state via partial trace.

### 2. Trajectory Trail

When enabled (checkbox in the Qubits section), a trail is drawn on the sphere showing the path the state vector has taken as gates are applied. This is great for visualizing how rotation gates trace out arcs on the sphere.

The trail stores up to 200 points and fades for inactive qubits.

### 3. Single-Qubit Gates

Available gates in the "Single-Qubit Gates" section:

| Gate | Key | Description |
|------|-----|-------------|
| X | `x` | Pauli-X (NOT gate). Rotates pi around X-axis. Flips |0> to |1>. |
| Y | `y` | Pauli-Y. Rotates pi around Y-axis with a phase factor. |
| Z | `z` | Pauli-Z. Phase flip. Rotates pi around Z-axis. |
| H | `h` | Hadamard. Creates equal superposition. |0> becomes |+>. |
| S | `s` | S gate. pi/2 phase rotation (square root of Z). |
| S-dagger | — | Inverse of S. -pi/2 phase rotation. |
| T | `t` | T gate. pi/4 phase rotation (square root of S). |
| T-dagger | — | Inverse of T. -pi/4 phase rotation. |

### 4. Rotation Gates

Use the theta slider to set an arbitrary rotation angle, then click:

- **Rx**: Rotation about the X-axis
- **Ry**: Rotation about the Y-axis
- **Rz**: Rotation about the Z-axis
- **Rn**: Rotation about a custom axis defined by (nx, ny, nz) sliders

The angle display auto-detects common fractions of pi.

### 5. Entangling Gates (Multi-Qubit)

With 2 or more qubits, the "Entangling Gates" section becomes active. Select control and target qubits, then apply:

| Gate | Description |
|------|-------------|
| CNOT | Controlled-NOT. Flips target if control is |1>. |
| CZ | Controlled-Z. Applies Z to target if control is |1>. |
| SWAP | Swaps the states of two qubits. |
| CH | Controlled-Hadamard. Applies H to target if control is |1>. |

**Important:** These are true entangling operations on a shared state vector. After a CNOT, qubits become entangled and their individual Bloch vectors shrink inside the sphere (mixed state).

### 6. Multi-Qubit State Engine

The engine maintains a full 2^n dimensional state vector (up to 4 qubits = 16 amplitudes). This means entanglement is real, not simulated independently per qubit. Individual qubit Bloch vectors are computed via partial trace of the density matrix.

Click **+** to add qubits (up to 4). Click qubit tabs (q0, q1, etc.) to select which qubit gates act on. Keyboard shortcut: press `1`-`4` to select, `n` to add.

### 7. Probability Bars

The "Probabilities" section shows a real-time bar chart of measurement outcome probabilities for each computational basis state. For 2 qubits, you see |00>, |01>, |10>, |11>. For states with more than 8 basis vectors, only non-zero entries are shown.

### 8. Density Matrix

Shows the 2x2 reduced density matrix of the active qubit (computed via partial trace). Diagonal elements show populations, off-diagonal elements show coherence. For entangled qubits, the off-diagonal elements shrink.

### 9. Expectation Values and Fidelity

**Observables** section shows real-time expectation values of Pauli X, Y, Z for the active qubit. These correspond directly to the Bloch vector components.

**Fidelity** lets you select a target state (|0>, |1>, |+>, |->, |+i>, |-i>) and see how close the current qubit is to that state. Fidelity of 1.000 means an exact match. Color-coded: green (>0.99), yellow (>0.5), red (<0.5).

### 10. Circuit Diagram

The "Circuit" section displays a live circuit diagram that builds as you apply gates. Wire lines represent qubits, rectangular boxes represent single-qubit gates, and vertical lines with dots represent entangling gates (control dot + target box).

The diagram auto-scrolls as gates are added and updates in real time.

### 11. Measurement

**Single measurement:** Click Measure Z, Mx, or My to collapse the active qubit in the chosen basis. The result is shown with the outcome and its probability. Keyboard shortcut: `m` for Z-basis.

**Histogram:** The "Measurement Histogram" section simulates many measurements without collapsing the state. Enter a shot count (default 1024) and click Run. The bar chart shows outcome frequencies across all basis states.

### 12. OpenQASM Export

Click **QASM** in the toolbar to generate an OpenQASM 2.0 representation of your circuit. Supports all standard gates (x, y, z, h, s, sdg, t, tdg, rx, ry, rz) and two-qubit gates (cx, cz, swap, ch). Click "Copy to Clipboard" to copy.

### 13. Quantum Recipes

Click **Recipes** in the toolbar to see pre-built circuits:

| Recipe | Qubits | Description |
|--------|--------|-------------|
| Bell State (Phi+) | 2 | Creates |00> + |11> entanglement |
| Bell State (Psi+) | 2 | Creates |01> + |10> entanglement |
| GHZ State | 3 | 3-qubit entanglement: |000> + |111> |
| Uniform Superposition | All | Hadamard on every qubit |
| Teleportation Setup | 3 | Prepares entangled channel for teleportation |
| SWAP Test | 3 | Circuit for comparing two quantum states |
| Phase Kickback | 2 | Demonstrates phase kickback phenomenon |

Clicking a recipe resets the state, adds qubits as needed, and applies the gate sequence with animations.

### 14. Quiz Mode

Click **Quiz** in the toolbar for interactive challenges. You are given a target state and must apply gates to reach it using as few gates as possible. Fidelity is tracked in real time, and you win when fidelity exceeds 0.999.

Challenges include reaching |1>, |+>, |->, |+i>, |-i>, and recovering |0> from |+>.

### 15. Tutorial

An 8-step walkthrough covering the Bloch sphere, gates, superposition, rotation gates, measurement, multi-qubit systems, and entanglement. Appears as a bar at the bottom of the viewport. Navigate with Next/Back buttons or press Escape to close.

### 16. Save, Load, and Share

- **Save:** Downloads the current state as a JSON file (amplitudes, gate history, qubit count)
- **Load:** Opens a previously saved JSON file to restore the state
- **Share:** Encodes the state into the URL hash and copies to clipboard. Anyone opening the URL will see the same state.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| X | Apply Pauli-X |
| Y | Apply Pauli-Y |
| Z | Apply Pauli-Z |
| H | Apply Hadamard |
| S | Apply S gate |
| T | Apply T gate |
| M | Measure active qubit (Z basis) |
| U or Ctrl+Z | Undo last gate |
| R | Reset all qubits to |0> |
| N | Add a new qubit |
| 1-4 | Select qubit q0-q3 |
| ? or / | Show shortcuts modal |
| Escape | Close any open modal or tutorial |

---

## Architecture

The entire application is a single self-contained HTML file with inline CSS and JavaScript. No external dependencies or build tools are required.

### State Engine

The `QuantumState` class maintains a full 2^n complex amplitude vector. Single-qubit gates are applied by iterating over pairs of amplitudes sharing the same bit pattern (except the target qubit bit). Two-qubit gates operate on 4x4 subspaces.

Reduced density matrices for individual qubits are computed via partial trace, allowing Bloch vector extraction even for entangled states.

### Rendering

WebGL is used for the 3D Bloch sphere with custom shaders for solid geometry (sphere) and line rendering (axes, arrows, trails). A 2D canvas overlay handles text labels. The circuit diagram and histogram use separate 2D canvases.

### Animation

Gate applications are animated with eased interpolation between the before and after Bloch vectors (350ms duration, cubic ease-in-out). The actual quantum state is updated immediately; animation is purely visual.

---

## Limitations

- Maximum of 4 qubits (16-dimensional state vector). Beyond this, the Bloch sphere visualization becomes less meaningful per qubit.
- Entangling gates use a control/target model. More complex multi-qubit gates (Toffoli, etc.) are not included but could be added.
- The circuit diagram scrolls horizontally but has limited space. Very long circuits may overflow.
- OpenQASM export doesn't include custom axis rotation (Rn) in standard QASM syntax; these are exported as comments.
- Share URLs can become very long for multi-qubit states with many amplitudes.
