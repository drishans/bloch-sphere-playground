/**
 * Quantum gate definitions: single-qubit (2x2) and two-qubit (4x4) matrices.
 */
import { Complex, C, ZERO, ONE, I_C, SQRT2_INV } from './complex';

/** A 2x2 gate as [a, b, c, d] representing [[a,b],[c,d]] */
export type Gate2x2 = [Complex, Complex, Complex, Complex];

/** A 4x4 gate as flat array of 16 Complex entries (row-major) */
export type Gate4x4 = Complex[];

// ── Single-qubit gates ──────────────────────────────────────
export const GATES: Record<string, Gate2x2> = {
  X:  [ZERO, ONE, ONE, ZERO],
  Y:  [ZERO, C(0, -1), C(0, 1), ZERO],
  Z:  [ONE, ZERO, ZERO, C(-1)],
  H:  [SQRT2_INV, SQRT2_INV, SQRT2_INV, SQRT2_INV.scale(-1)],
  S:  [ONE, ZERO, ZERO, I_C],
  Sd: [ONE, ZERO, ZERO, C(0, -1)],
  T:  [ONE, ZERO, ZERO, C(Math.cos(Math.PI / 4), Math.sin(Math.PI / 4))],
  Td: [ONE, ZERO, ZERO, C(Math.cos(Math.PI / 4), -Math.sin(Math.PI / 4))],
};

// ── Two-qubit gates (basis: |00>, |01>, |10>, |11>) ────────
export const GATES2: Record<string, Gate4x4> = {
  CNOT: [
    ONE, ZERO, ZERO, ZERO,
    ZERO, ONE, ZERO, ZERO,
    ZERO, ZERO, ZERO, ONE,
    ZERO, ZERO, ONE, ZERO,
  ],
  CZ: [
    ONE, ZERO, ZERO, ZERO,
    ZERO, ONE, ZERO, ZERO,
    ZERO, ZERO, ONE, ZERO,
    ZERO, ZERO, ZERO, C(-1),
  ],
  SWAP: [
    ONE, ZERO, ZERO, ZERO,
    ZERO, ZERO, ONE, ZERO,
    ZERO, ONE, ZERO, ZERO,
    ZERO, ZERO, ZERO, ONE,
  ],
  CH: [
    ONE, ZERO, ZERO, ZERO,
    ZERO, ONE, ZERO, ZERO,
    ZERO, ZERO, SQRT2_INV, SQRT2_INV,
    ZERO, ZERO, SQRT2_INV, SQRT2_INV.scale(-1),
  ],
};

// ── Rotation gates ──────────────────────────────────────────
export function rotationGate(axis: string | { nx: number; ny: number; nz: number }, angle: number): Gate2x2 {
  const c = Math.cos(angle / 2), s = Math.sin(angle / 2);
  if (axis === 'x') return [C(c), C(0, -s), C(0, -s), C(c)];
  if (axis === 'y') return [C(c), C(-s), C(s), C(c)];
  if (axis === 'z') return [C(c, -s), ZERO, ZERO, C(c, s)];
  if (typeof axis === 'object') {
    const { nx, ny, nz } = axis;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len < 1e-10) return [ONE, ZERO, ZERO, ONE];
    const ux = nx / len, uy = ny / len, uz = nz / len;
    return [
      C(c, -s * uz), C(-s * uy, -s * ux),
      C(s * uy, -s * ux), C(c, s * uz),
    ];
  }
  return [ONE, ZERO, ZERO, ONE];
}

// ── Gate metadata for display ───────────────────────────────
export const GATE_INFO: Record<string, { label: string; color: string; desc: string; keys?: string }> = {
  X:    { label: 'X',  color: '#ff7675', desc: 'Pauli-X (NOT): Rotates \u03C0 around X-axis. |0\u27E9\u2194|1\u27E9', keys: 'x' },
  Y:    { label: 'Y',  color: '#ff7675', desc: 'Pauli-Y: Rotates \u03C0 around Y-axis with phase.', keys: 'y' },
  Z:    { label: 'Z',  color: '#ff7675', desc: 'Pauli-Z: Phase flip. Rotates \u03C0 around Z-axis.', keys: 'z' },
  H:    { label: 'H',  color: '#ffeaa7', desc: 'Hadamard: Equal superposition. |0\u27E9\u2192|+\u27E9', keys: 'h' },
  S:    { label: 'S',  color: '#74b9ff', desc: 'S: \u03C0/2 phase rotation around Z. \u221AZ.', keys: 's' },
  Sd:   { label: 'S\u2020', color: '#74b9ff', desc: 'S-dagger: -\u03C0/2 phase rotation.' },
  T:    { label: 'T',  color: '#74b9ff', desc: 'T: \u03C0/4 phase rotation. \u221AS.', keys: 't' },
  Td:   { label: 'T\u2020', color: '#74b9ff', desc: 'T-dagger: -\u03C0/4 phase rotation.' },
  CNOT: { label: 'CNOT', color: '#55efc4', desc: 'Controlled-NOT: Flips target if control is |1\u27E9.' },
  CZ:   { label: 'CZ',   color: '#55efc4', desc: 'Controlled-Z: Z on target if control is |1\u27E9.' },
  SWAP: { label: 'SWAP', color: '#55efc4', desc: 'Swaps the states of two qubits.' },
  CH:   { label: 'CH',   color: '#55efc4', desc: 'Controlled-H: H on target if control is |1\u27E9.' },
};
