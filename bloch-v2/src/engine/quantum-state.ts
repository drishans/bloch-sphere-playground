/**
 * Multi-qubit quantum state engine.
 * Maintains a full 2^n complex amplitude vector supporting entanglement.
 */
import { Complex, C, ONE, ZERO, SQRT2_INV } from './complex';
import type { Gate2x2, Gate4x4 } from './gates';
import { GATES } from './gates';

export interface BlochCoords { x: number; y: number; z: number; }
export interface GateRecord { gate: string; qubits: number[]; type: 'single' | 'two' | 'measure' | 'special'; }
export interface MeasureResult { outcome: number; label: string; prob: number; }

export const TARGET_STATES: Record<string, [Complex, Complex]> = {
  '0': [ONE, ZERO],
  '1': [ZERO, ONE],
  '+': [SQRT2_INV, SQRT2_INV],
  '-': [SQRT2_INV, SQRT2_INV.scale(-1)],
  '+i': [SQRT2_INV, C(0, 1 / Math.sqrt(2))],
  '-i': [SQRT2_INV, C(0, -1 / Math.sqrt(2))],
};

export class QuantumState {
  n: number;
  dim: number;
  amps: Complex[];
  history: GateRecord[] = [];
  stateHistory: Complex[][] = [];

  constructor(n = 1) {
    this.n = n;
    this.dim = 1 << n;
    this.amps = Array.from({ length: this.dim }, () => C(0));
    this.amps[0] = C(1);
    this.stateHistory = [this.copyAmps()];
  }

  copyAmps(): Complex[] { return this.amps.map(a => C(a.re, a.im)); }

  addQubit(): void {
    const newDim = this.dim * 2;
    const newAmps = Array.from({ length: newDim }, () => C(0));
    for (let i = 0; i < this.dim; i++) newAmps[i * 2] = C(this.amps[i].re, this.amps[i].im);
    this.n++; this.dim = newDim; this.amps = newAmps;
    this.stateHistory = [this.copyAmps()]; this.history = [];
  }

  normalize(): void {
    let norm = 0;
    for (let i = 0; i < this.dim; i++) norm += this.amps[i].abs2();
    norm = Math.sqrt(norm);
    if (norm > 1e-10) for (let i = 0; i < this.dim; i++) this.amps[i] = this.amps[i].scale(1 / norm);
  }

  applySingleGate(matrix: Gate2x2, q: number, label: string): void {
    const newAmps = Array.from({ length: this.dim }, () => C(0));
    const bit = this.n - 1 - q;
    const mask = 1 << bit;
    for (let i = 0; i < this.dim; i++) {
      if (i & mask) continue;
      const i0 = i, i1 = i | mask;
      newAmps[i0] = matrix[0].mul(this.amps[i0]).add(matrix[1].mul(this.amps[i1]));
      newAmps[i1] = matrix[2].mul(this.amps[i0]).add(matrix[3].mul(this.amps[i1]));
    }
    this.amps = newAmps; this.normalize();
    this.history.push({ gate: label, qubits: [q], type: 'single' });
    this.stateHistory.push(this.copyAmps());
  }

  applyTwoQubitGate(matrix: Gate4x4, q1: number, q2: number, label: string): void {
    const newAmps = this.copyAmps();
    const bit1 = this.n - 1 - q1, bit2 = this.n - 1 - q2;
    const mask1 = 1 << bit1, mask2 = 1 << bit2;
    const visited = new Set<number>();
    for (let i = 0; i < this.dim; i++) {
      const base = i & ~mask1 & ~mask2;
      if (visited.has(base)) continue;
      visited.add(base);
      const indices = [base, base | mask2, base | mask1, base | mask1 | mask2];
      const v = indices.map(idx => this.amps[idx]);
      for (let r = 0; r < 4; r++) {
        let sum = C(0);
        for (let c = 0; c < 4; c++) sum = sum.add(matrix[r * 4 + c].mul(v[c]));
        newAmps[indices[r]] = sum;
      }
    }
    this.amps = newAmps; this.normalize();
    this.history.push({ gate: label, qubits: [q1, q2], type: 'two' });
    this.stateHistory.push(this.copyAmps());
  }

  undo(): void {
    if (this.stateHistory.length > 1) {
      this.stateHistory.pop(); this.history.pop();
      this.amps = this.stateHistory[this.stateHistory.length - 1].map(a => C(a.re, a.im));
    }
  }

  reset(): void {
    this.amps = Array.from({ length: this.dim }, () => C(0));
    this.amps[0] = C(1);
    this.history = []; this.stateHistory = [this.copyAmps()];
  }

  getReducedDensity(q: number): [Complex, Complex, Complex, Complex] {
    const bit = this.n - 1 - q;
    const mask = 1 << bit;
    let rho00 = C(0), rho01 = C(0), rho10 = C(0), rho11 = C(0);
    for (let i = 0; i < this.dim; i++) {
      if (i & mask) continue;
      const i0 = i, i1 = i | mask;
      rho00 = rho00.add(this.amps[i0].mul(this.amps[i0].conj()));
      rho01 = rho01.add(this.amps[i0].mul(this.amps[i1].conj()));
      rho10 = rho10.add(this.amps[i1].mul(this.amps[i0].conj()));
      rho11 = rho11.add(this.amps[i1].mul(this.amps[i1].conj()));
    }
    return [rho00, rho01, rho10, rho11];
  }

  getBloch(q: number): BlochCoords {
    const rho = this.getReducedDensity(q);
    return { x: 2 * rho[1].re, y: -2 * rho[1].im, z: rho[0].re - rho[3].re };
  }

  getProbs(): number[] { return this.amps.map(a => a.abs2()); }

  measureQubit(q: number, basis = 'z'): MeasureResult {
    const bit = this.n - 1 - q;
    const mask = 1 << bit;

    if (basis === 'x') { this._silentGate(GATES.H, q); }
    else if (basis === 'y') { this._silentGate(GATES.Sd, q); this._silentGate(GATES.H, q); }

    let prob0 = 0;
    for (let i = 0; i < this.dim; i++) if (!(i & mask)) prob0 += this.amps[i].abs2();
    const outcome = Math.random() < prob0 ? 0 : 1;
    for (let i = 0; i < this.dim; i++) { if (((i & mask) ? 1 : 0) !== outcome) this.amps[i] = C(0); }
    this.normalize();

    if (basis === 'x') { this._silentGate(GATES.H, q); }
    else if (basis === 'y') { this._silentGate(GATES.H, q); this._silentGate(GATES.S, q); }

    const labels = basis === 'z' ? ['|0\u27E9', '|1\u27E9'] : basis === 'x' ? ['|+\u27E9', '|\u2212\u27E9'] : ['|+i\u27E9', '|\u2212i\u27E9'];
    this.history.push({ gate: `M${basis}\u2192${labels[outcome]}`, qubits: [q], type: 'measure' });
    this.stateHistory.push(this.copyAmps());
    return { outcome, label: labels[outcome], prob: outcome === 0 ? prob0 : 1 - prob0 };
  }

  /** Apply gate without recording in history */
  private _silentGate(matrix: Gate2x2, q: number): void {
    const newAmps = Array.from({ length: this.dim }, () => C(0));
    const bit = this.n - 1 - q, mask = 1 << bit;
    for (let i = 0; i < this.dim; i++) {
      if (i & mask) continue;
      const i0 = i, i1 = i | mask;
      newAmps[i0] = matrix[0].mul(this.amps[i0]).add(matrix[1].mul(this.amps[i1]));
      newAmps[i1] = matrix[2].mul(this.amps[i0]).add(matrix[3].mul(this.amps[i1]));
    }
    this.amps = newAmps; this.normalize();
  }

  simulateMeasurements(shots: number): number[] {
    const probs = this.getProbs();
    const counts = new Array(this.dim).fill(0);
    for (let s = 0; s < shots; s++) {
      let r = Math.random();
      for (let i = 0; i < this.dim; i++) { r -= probs[i]; if (r <= 0) { counts[i]++; break; } }
    }
    return counts;
  }

  expectation(pauli: string, q: number): number {
    const b = this.getBloch(q);
    return pauli === 'X' ? b.x : pauli === 'Y' ? b.y : b.z;
  }

  fidelityTo(q: number, target: [Complex, Complex]): number {
    const rho = this.getReducedDensity(q);
    const [a, b] = target;
    const f = a.conj().mul(rho[0].mul(a).add(rho[1].mul(b)))
      .add(b.conj().mul(rho[2].mul(a).add(rho[3].mul(b))));
    return Math.max(0, Math.min(1, f.re));
  }

  /** Serialize for save/share */
  serialize(): string {
    return JSON.stringify({ n: this.n, amps: this.amps.map(a => [a.re, a.im]), history: this.history });
  }

  static deserialize(json: string): QuantumState {
    const data = JSON.parse(json);
    const qs = new QuantumState(data.n);
    qs.amps = data.amps.map(([re, im]: [number, number]) => C(re, im));
    qs.history = data.history || [];
    qs.stateHistory = [qs.copyAmps()];
    return qs;
  }
}
