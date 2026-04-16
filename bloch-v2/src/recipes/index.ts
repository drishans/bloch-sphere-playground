/**
 * Pre-built quantum circuit recipes.
 */
export interface RecipeStep {
  type: 'single' | 'two';
  gate: string;
  qubit?: number;
  q1?: number;
  q2?: number;
}

export interface Recipe {
  name: string;
  desc: string;
  minQubits: number;
  steps: RecipeStep[] | 'hadamard_all';
  source: string; // Source code representation for the code viewer
}

export const RECIPES: Recipe[] = [
  {
    name: 'Bell State (\u03A6\u207A)',
    desc: 'Create maximally entangled state (|00\u27E9 + |11\u27E9)/\u221A2 using H and CNOT.',
    minQubits: 2,
    steps: [
      { type: 'single', gate: 'H', qubit: 0 },
      { type: 'two', gate: 'CNOT', q1: 0, q2: 1 },
    ],
    source: `// Bell State (Φ⁺)
// Creates maximal entanglement between two qubits
H  q[0];      // Put qubit 0 in superposition
CNOT q[0], q[1];  // Entangle with qubit 1
// Result: (|00⟩ + |11⟩) / √2`,
  },
  {
    name: 'Bell State (\u03A8\u207A)',
    desc: 'Create |01\u27E9 + |10\u27E9 using X, H, and CNOT.',
    minQubits: 2,
    steps: [
      { type: 'single', gate: 'X', qubit: 0 },
      { type: 'single', gate: 'H', qubit: 0 },
      { type: 'two', gate: 'CNOT', q1: 0, q2: 1 },
    ],
    source: `// Bell State (Ψ⁺)
X  q[0];          // Flip to |1⟩
H  q[0];          // Create |−⟩ superposition
CNOT q[0], q[1];  // Entangle
// Result: (|01⟩ + |10⟩) / √2`,
  },
  {
    name: 'GHZ State (3 qubits)',
    desc: 'Greenberger-Horne-Zeilinger: (|000\u27E9 + |111\u27E9)/\u221A2.',
    minQubits: 3,
    steps: [
      { type: 'single', gate: 'H', qubit: 0 },
      { type: 'two', gate: 'CNOT', q1: 0, q2: 1 },
      { type: 'two', gate: 'CNOT', q1: 0, q2: 2 },
    ],
    source: `// GHZ State (3-qubit entanglement)
H  q[0];          // Superposition on qubit 0
CNOT q[0], q[1];  // Entangle q0-q1
CNOT q[0], q[2];  // Entangle q0-q2
// Result: (|000⟩ + |111⟩) / √2
// All three qubits are maximally entangled`,
  },
  {
    name: 'Uniform Superposition',
    desc: 'Hadamard on every qubit: equal probability of all basis states.',
    minQubits: 1,
    steps: 'hadamard_all',
    source: `// Uniform Superposition
// Apply Hadamard to all qubits
for q in qubits:
    H q;
// Result: equal probability 1/2^n for each basis state`,
  },
  {
    name: 'Phase Kickback',
    desc: 'CNOT with target in |\u2212\u27E9 kicks phase back to control.',
    minQubits: 2,
    steps: [
      { type: 'single', gate: 'X', qubit: 1 },
      { type: 'single', gate: 'H', qubit: 1 },
      { type: 'single', gate: 'H', qubit: 0 },
      { type: 'two', gate: 'CNOT', q1: 0, q2: 1 },
      { type: 'single', gate: 'H', qubit: 0 },
    ],
    source: `// Phase Kickback Demonstration
X  q[1];          // Prepare target as |1⟩
H  q[1];          // Target → |−⟩
H  q[0];          // Control in superposition
CNOT q[0], q[1];  // Phase kicks back to control!
H  q[0];          // Reveal phase on control
// Control qubit flips to |1⟩ due to kickback`,
  },
  {
    name: 'Quantum Teleportation Setup',
    desc: 'Prepare entangled channel for teleportation (3 qubits).',
    minQubits: 3,
    steps: [
      { type: 'single', gate: 'H', qubit: 0 },
      { type: 'single', gate: 'H', qubit: 1 },
      { type: 'two', gate: 'CNOT', q1: 1, q2: 2 },
    ],
    source: `// Quantum Teleportation Setup
// q0: state to teleport (prepared in superposition)
// q1-q2: entangled Bell pair (the channel)
H  q[0];          // State to teleport
H  q[1];          // Begin Bell pair
CNOT q[1], q[2];  // Complete Bell pair
// Now q1-q2 are entangled, q0 holds state to send`,
  },
  {
    name: 'SWAP Test',
    desc: 'Circuit to compare two quantum states (3 qubits).',
    minQubits: 3,
    steps: [
      { type: 'single', gate: 'H', qubit: 0 },
      { type: 'two', gate: 'SWAP', q1: 1, q2: 2 },
      { type: 'single', gate: 'H', qubit: 0 },
    ],
    source: `// SWAP Test
// Ancilla q0, test states q1 and q2
H  q[0];          // Ancilla in superposition
SWAP q[1], q[2];  // Controlled-SWAP (simplified)
H  q[0];          // Interfere
// Measure q0: P(0) = (1 + |⟨ψ₁|ψ₂⟩|²) / 2`,
  },
];

export interface QuizChallenge {
  label: string;
  target: [{ re: number; im: number }, { re: number; im: number }];
  hint: string;
  startGates?: string[];
}

export const QUIZ_CHALLENGES: QuizChallenge[] = [
  { label: '|1\u27E9', target: [{ re: 0, im: 0 }, { re: 1, im: 0 }], hint: 'Flip from |0\u27E9 to |1\u27E9' },
  { label: '|+\u27E9', target: [{ re: 1 / Math.sqrt(2), im: 0 }, { re: 1 / Math.sqrt(2), im: 0 }], hint: 'Equal superposition with positive phases' },
  { label: '|\u2212\u27E9', target: [{ re: 1 / Math.sqrt(2), im: 0 }, { re: -1 / Math.sqrt(2), im: 0 }], hint: 'Superposition with negative phase on |1\u27E9' },
  { label: '|+i\u27E9', target: [{ re: 1 / Math.sqrt(2), im: 0 }, { re: 0, im: 1 / Math.sqrt(2) }], hint: 'Y-axis of the Bloch sphere' },
  { label: '|\u2212i\u27E9', target: [{ re: 1 / Math.sqrt(2), im: 0 }, { re: 0, im: -1 / Math.sqrt(2) }], hint: 'Opposite of |+i\u27E9' },
  { label: '|0\u27E9 (from |+\u27E9)', target: [{ re: 1, im: 0 }, { re: 0, im: 0 }], hint: 'Starting from |+\u27E9, get back to |0\u27E9', startGates: ['H'] },
];

export const TUTORIAL_STEPS = [
  { title: 'Welcome', text: 'Welcome to the <em>Bloch Sphere Playground</em>! This tool visualizes quantum states as points on a sphere. The north pole is |0\u27E9 and the south pole is |1\u27E9.' },
  { title: 'The Bloch Sphere', text: '<em>Drag</em> to rotate the view, <em>scroll</em> to zoom. The colored arrow shows your quantum state vector.' },
  { title: 'Applying Gates', text: 'Click any gate button (like <em>H</em>) to apply it. Watch the state vector animate on the sphere! <em>X, Y, Z</em> rotate by \u03C0 around their axes.' },
  { title: 'Superposition', text: 'Click <em>H</em> (Hadamard) to create equal superposition. The vector moves to the equator — 50/50 measurement probability.' },
  { title: 'Rotation Gates', text: 'Use the <em>\u03B8 slider</em> then click R\u2093/R\u1D67/R\u1D69 for continuous rotations. Fine-grained state control.' },
  { title: 'Measurement', text: 'Click <em>Measure Z</em> to collapse. Run the <em>histogram</em> for statistics over many shots.' },
  { title: 'Entanglement', text: 'Click <em>+</em> to add qubits, then use <em>CNOT</em>. Try the "Bell State" recipe! Entangled qubits have Bloch vectors inside the sphere.' },
  { title: 'Explore!', text: 'Use <em>Recipes</em> for pre-built circuits, <em>Quiz</em> to test skills, <em>QASM</em> to export, and the <em>code editor</em> below to modify shaders live.' },
];
