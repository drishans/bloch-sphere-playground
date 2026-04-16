import { describe, it, expect, beforeEach } from 'vitest';
import { QuantumState, TARGET_STATES } from '../quantum-state';
import { GATES, GATES2, rotationGate } from '../gates';
import { C, ONE, ZERO, SQRT2_INV } from '../complex';

describe('QuantumState', () => {
  let qs: QuantumState;

  beforeEach(() => {
    qs = new QuantumState(1);
  });

  describe('initialization', () => {
    it('starts in |0> for 1 qubit', () => {
      expect(qs.n).toBe(1);
      expect(qs.dim).toBe(2);
      expect(qs.amps[0].abs2()).toBeCloseTo(1);
      expect(qs.amps[1].abs2()).toBeCloseTo(0);
    });

    it('starts in |00> for 2 qubits', () => {
      const qs2 = new QuantumState(2);
      expect(qs2.dim).toBe(4);
      expect(qs2.amps[0].abs2()).toBeCloseTo(1);
      for (let i = 1; i < 4; i++) expect(qs2.amps[i].abs2()).toBeCloseTo(0);
    });

    it('starts in |000> for 3 qubits', () => {
      const qs3 = new QuantumState(3);
      expect(qs3.dim).toBe(8);
      expect(qs3.amps[0].abs2()).toBeCloseTo(1);
    });

    it('empty history', () => {
      expect(qs.history).toHaveLength(0);
      expect(qs.stateHistory).toHaveLength(1);
    });
  });

  describe('addQubit', () => {
    it('doubles dimension', () => {
      qs.addQubit();
      expect(qs.n).toBe(2);
      expect(qs.dim).toBe(4);
    });

    it('preserves |0> state as |00>', () => {
      qs.addQubit();
      expect(qs.amps[0].abs2()).toBeCloseTo(1);
    });

    it('tensors |+> with |0> correctly', () => {
      qs.applySingleGate(GATES.H, 0, 'H');
      qs.addQubit();
      // Should be (|0>+|1>)/sqrt(2) x |0> = (|00> + |10>)/sqrt(2)
      expect(qs.amps[0].abs2()).toBeCloseTo(0.5); // |00>
      expect(qs.amps[1].abs2()).toBeCloseTo(0);    // |01>
      expect(qs.amps[2].abs2()).toBeCloseTo(0.5);  // |10>
      expect(qs.amps[3].abs2()).toBeCloseTo(0);    // |11>
    });

    it('resets history after addQubit', () => {
      qs.applySingleGate(GATES.X, 0, 'X');
      qs.addQubit();
      expect(qs.history).toHaveLength(0);
    });
  });

  describe('single-qubit gates', () => {
    it('X flips |0> to |1>', () => {
      qs.applySingleGate(GATES.X, 0, 'X');
      expect(qs.amps[0].abs2()).toBeCloseTo(0);
      expect(qs.amps[1].abs2()).toBeCloseTo(1);
    });

    it('H creates superposition', () => {
      qs.applySingleGate(GATES.H, 0, 'H');
      expect(qs.amps[0].abs2()).toBeCloseTo(0.5);
      expect(qs.amps[1].abs2()).toBeCloseTo(0.5);
    });

    it('records history', () => {
      qs.applySingleGate(GATES.X, 0, 'X');
      expect(qs.history).toHaveLength(1);
      expect(qs.history[0]).toEqual({ gate: 'X', qubits: [0], type: 'single' });
    });

    it('applies to correct qubit in multi-qubit system', () => {
      const qs2 = new QuantumState(2);
      qs2.applySingleGate(GATES.X, 1, 'X'); // flip qubit 1 only
      // |00> -> |01>
      expect(qs2.amps[0].abs2()).toBeCloseTo(0);
      expect(qs2.amps[1].abs2()).toBeCloseTo(1);
      expect(qs2.amps[2].abs2()).toBeCloseTo(0);
      expect(qs2.amps[3].abs2()).toBeCloseTo(0);
    });

    it('applies X to qubit 0 in 2-qubit system', () => {
      const qs2 = new QuantumState(2);
      qs2.applySingleGate(GATES.X, 0, 'X'); // flip qubit 0
      // |00> -> |10>
      expect(qs2.amps[0].abs2()).toBeCloseTo(0);
      expect(qs2.amps[1].abs2()).toBeCloseTo(0);
      expect(qs2.amps[2].abs2()).toBeCloseTo(1);
      expect(qs2.amps[3].abs2()).toBeCloseTo(0);
    });
  });

  describe('two-qubit gates', () => {
    it('CNOT|00> = |00>', () => {
      const qs2 = new QuantumState(2);
      qs2.applyTwoQubitGate(GATES2.CNOT, 0, 1, 'CNOT');
      expect(qs2.amps[0].abs2()).toBeCloseTo(1);
    });

    it('CNOT|10> = |11> (control=0, target=1)', () => {
      const qs2 = new QuantumState(2);
      qs2.applySingleGate(GATES.X, 0, 'X'); // |00> -> |10>
      qs2.applyTwoQubitGate(GATES2.CNOT, 0, 1, 'CNOT');
      // |10> -> |11>
      expect(qs2.amps[3].abs2()).toBeCloseTo(1);
    });

    it('creates Bell state: H(0) then CNOT(0,1)', () => {
      const qs2 = new QuantumState(2);
      qs2.applySingleGate(GATES.H, 0, 'H');
      qs2.applyTwoQubitGate(GATES2.CNOT, 0, 1, 'CNOT');
      // Bell state: (|00> + |11>)/sqrt(2)
      expect(qs2.amps[0].abs2()).toBeCloseTo(0.5);
      expect(qs2.amps[1].abs2()).toBeCloseTo(0);
      expect(qs2.amps[2].abs2()).toBeCloseTo(0);
      expect(qs2.amps[3].abs2()).toBeCloseTo(0.5);
    });

    it('SWAP|01> = |10>', () => {
      const qs2 = new QuantumState(2);
      qs2.applySingleGate(GATES.X, 1, 'X'); // |01>
      qs2.applyTwoQubitGate(GATES2.SWAP, 0, 1, 'SWAP');
      expect(qs2.amps[0].abs2()).toBeCloseTo(0);
      expect(qs2.amps[1].abs2()).toBeCloseTo(0);
      expect(qs2.amps[2].abs2()).toBeCloseTo(1); // |10>
      expect(qs2.amps[3].abs2()).toBeCloseTo(0);
    });

    it('CZ|11> = -|11>', () => {
      const qs2 = new QuantumState(2);
      qs2.applySingleGate(GATES.X, 0, 'X');
      qs2.applySingleGate(GATES.X, 1, 'X'); // |11>
      qs2.applyTwoQubitGate(GATES2.CZ, 0, 1, 'CZ');
      expect(qs2.amps[3].abs2()).toBeCloseTo(1);
      expect(qs2.amps[3].re).toBeCloseTo(-1);
    });

    it('records two-qubit gate history', () => {
      const qs2 = new QuantumState(2);
      qs2.applyTwoQubitGate(GATES2.CNOT, 0, 1, 'CNOT');
      expect(qs2.history[0].type).toBe('two');
      expect(qs2.history[0].qubits).toEqual([0, 1]);
    });
  });

  describe('undo', () => {
    it('undoes single gate', () => {
      qs.applySingleGate(GATES.X, 0, 'X');
      qs.undo();
      expect(qs.amps[0].abs2()).toBeCloseTo(1);
      expect(qs.amps[1].abs2()).toBeCloseTo(0);
    });

    it('undoes multiple gates in order', () => {
      qs.applySingleGate(GATES.H, 0, 'H');
      qs.applySingleGate(GATES.X, 0, 'X');
      qs.undo();
      // Should be back to H|0> = |+>
      expect(qs.amps[0].abs2()).toBeCloseTo(0.5);
      expect(qs.amps[1].abs2()).toBeCloseTo(0.5);
    });

    it('does nothing when no history', () => {
      qs.undo();
      expect(qs.amps[0].abs2()).toBeCloseTo(1);
    });

    it('removes from history', () => {
      qs.applySingleGate(GATES.X, 0, 'X');
      qs.undo();
      expect(qs.history).toHaveLength(0);
    });
  });

  describe('reset', () => {
    it('returns to |0...0>', () => {
      qs.applySingleGate(GATES.H, 0, 'H');
      qs.applySingleGate(GATES.X, 0, 'X');
      qs.reset();
      expect(qs.amps[0].abs2()).toBeCloseTo(1);
      expect(qs.history).toHaveLength(0);
    });
  });

  describe('getBloch', () => {
    it('|0> is north pole (0,0,1)', () => {
      const b = qs.getBloch(0);
      expect(b.x).toBeCloseTo(0);
      expect(b.y).toBeCloseTo(0);
      expect(b.z).toBeCloseTo(1);
    });

    it('|1> is south pole (0,0,-1)', () => {
      qs.applySingleGate(GATES.X, 0, 'X');
      const b = qs.getBloch(0);
      expect(b.x).toBeCloseTo(0);
      expect(b.y).toBeCloseTo(0);
      expect(b.z).toBeCloseTo(-1);
    });

    it('|+> is on X-axis (1,0,0)', () => {
      qs.applySingleGate(GATES.H, 0, 'H');
      const b = qs.getBloch(0);
      expect(b.x).toBeCloseTo(1);
      expect(b.y).toBeCloseTo(0);
      expect(b.z).toBeCloseTo(0);
    });

    it('|-> is on -X-axis (-1,0,0)', () => {
      qs.applySingleGate(GATES.X, 0, 'X');
      qs.applySingleGate(GATES.H, 0, 'H');
      const b = qs.getBloch(0);
      expect(b.x).toBeCloseTo(-1);
      expect(b.y).toBeCloseTo(0);
      expect(b.z).toBeCloseTo(0);
    });

    it('Bell state qubit has Bloch vector inside sphere (mixed)', () => {
      const qs2 = new QuantumState(2);
      qs2.applySingleGate(GATES.H, 0, 'H');
      qs2.applyTwoQubitGate(GATES2.CNOT, 0, 1, 'CNOT');
      const b = qs2.getBloch(0);
      const r = Math.sqrt(b.x ** 2 + b.y ** 2 + b.z ** 2);
      expect(r).toBeLessThan(0.1); // maximally mixed -> r ≈ 0
    });
  });

  describe('getReducedDensity', () => {
    it('|0> has density matrix [[1,0],[0,0]]', () => {
      const [r00, r01, r10, r11] = qs.getReducedDensity(0);
      expect(r00.re).toBeCloseTo(1);
      expect(r01.abs2()).toBeCloseTo(0);
      expect(r10.abs2()).toBeCloseTo(0);
      expect(r11.re).toBeCloseTo(0);
    });

    it('|+> has density matrix [[.5,.5],[.5,.5]]', () => {
      qs.applySingleGate(GATES.H, 0, 'H');
      const [r00, r01, r10, r11] = qs.getReducedDensity(0);
      expect(r00.re).toBeCloseTo(0.5);
      expect(r01.re).toBeCloseTo(0.5);
      expect(r10.re).toBeCloseTo(0.5);
      expect(r11.re).toBeCloseTo(0.5);
    });

    it('Bell state has maximally mixed reduced density', () => {
      const qs2 = new QuantumState(2);
      qs2.applySingleGate(GATES.H, 0, 'H');
      qs2.applyTwoQubitGate(GATES2.CNOT, 0, 1, 'CNOT');
      const [r00, r01, r10, r11] = qs2.getReducedDensity(0);
      expect(r00.re).toBeCloseTo(0.5);
      expect(r11.re).toBeCloseTo(0.5);
      expect(r01.abs2()).toBeCloseTo(0);
    });
  });

  describe('getProbs', () => {
    it('|0> gives [1, 0]', () => {
      const p = qs.getProbs();
      expect(p[0]).toBeCloseTo(1);
      expect(p[1]).toBeCloseTo(0);
    });

    it('|+> gives [0.5, 0.5]', () => {
      qs.applySingleGate(GATES.H, 0, 'H');
      const p = qs.getProbs();
      expect(p[0]).toBeCloseTo(0.5);
      expect(p[1]).toBeCloseTo(0.5);
    });

    it('probabilities sum to 1', () => {
      qs.applySingleGate(GATES.H, 0, 'H');
      qs.applySingleGate(GATES.T, 0, 'T');
      const sum = qs.getProbs().reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1);
    });
  });

  describe('measureQubit', () => {
    it('measuring |0> in Z always gives 0', () => {
      const result = qs.measureQubit(0, 'z');
      expect(result.outcome).toBe(0);
      expect(result.prob).toBeCloseTo(1);
    });

    it('measuring |1> in Z always gives 1', () => {
      qs.applySingleGate(GATES.X, 0, 'X');
      const result = qs.measureQubit(0, 'z');
      expect(result.outcome).toBe(1);
      expect(result.prob).toBeCloseTo(1);
    });

    it('measuring |+> in X always gives 0 (|+>)', () => {
      qs.applySingleGate(GATES.H, 0, 'H');
      const result = qs.measureQubit(0, 'x');
      expect(result.outcome).toBe(0);
      expect(result.prob).toBeCloseTo(1);
    });

    it('collapses state after measurement', () => {
      qs.applySingleGate(GATES.H, 0, 'H');
      const result = qs.measureQubit(0, 'z');
      // After measurement, should be in definite state
      const probs = qs.getProbs();
      if (result.outcome === 0) {
        expect(probs[0]).toBeCloseTo(1);
      } else {
        expect(probs[1]).toBeCloseTo(1);
      }
    });

    it('records measurement in history', () => {
      qs.measureQubit(0, 'z');
      expect(qs.history).toHaveLength(1);
      expect(qs.history[0].type).toBe('measure');
    });
  });

  describe('simulateMeasurements', () => {
    it('|0> gives all zeros', () => {
      const counts = qs.simulateMeasurements(100);
      expect(counts[0]).toBe(100);
      expect(counts[1]).toBe(0);
    });

    it('|+> gives roughly 50/50', () => {
      qs.applySingleGate(GATES.H, 0, 'H');
      const counts = qs.simulateMeasurements(10000);
      const ratio = counts[0] / 10000;
      expect(ratio).toBeGreaterThan(0.4);
      expect(ratio).toBeLessThan(0.6);
    });

    it('total counts equal shots', () => {
      qs.applySingleGate(GATES.H, 0, 'H');
      const counts = qs.simulateMeasurements(1000);
      expect(counts.reduce((a: number, b: number) => a + b, 0)).toBe(1000);
    });
  });

  describe('expectation values', () => {
    it('|0>: <Z>=1, <X>=0, <Y>=0', () => {
      expect(qs.expectation('Z', 0)).toBeCloseTo(1);
      expect(qs.expectation('X', 0)).toBeCloseTo(0);
      expect(qs.expectation('Y', 0)).toBeCloseTo(0);
    });

    it('|+>: <X>=1, <Z>=0', () => {
      qs.applySingleGate(GATES.H, 0, 'H');
      expect(qs.expectation('X', 0)).toBeCloseTo(1);
      expect(qs.expectation('Z', 0)).toBeCloseTo(0);
    });

    it('|1>: <Z>=-1', () => {
      qs.applySingleGate(GATES.X, 0, 'X');
      expect(qs.expectation('Z', 0)).toBeCloseTo(-1);
    });
  });

  describe('fidelity', () => {
    it('|0> has fidelity 1 to |0>', () => {
      expect(qs.fidelityTo(0, TARGET_STATES['0'])).toBeCloseTo(1);
    });

    it('|0> has fidelity 0 to |1>', () => {
      expect(qs.fidelityTo(0, TARGET_STATES['1'])).toBeCloseTo(0);
    });

    it('|0> has fidelity 0.5 to |+>', () => {
      expect(qs.fidelityTo(0, TARGET_STATES['+'])).toBeCloseTo(0.5);
    });

    it('|+> has fidelity 1 to |+>', () => {
      qs.applySingleGate(GATES.H, 0, 'H');
      expect(qs.fidelityTo(0, TARGET_STATES['+'])).toBeCloseTo(1);
    });
  });

  describe('serialize / deserialize', () => {
    it('round-trips single qubit state', () => {
      qs.applySingleGate(GATES.H, 0, 'H');
      const json = qs.serialize();
      const qs2 = QuantumState.deserialize(json);
      expect(qs2.n).toBe(1);
      expect(qs2.amps[0].abs2()).toBeCloseTo(0.5);
      expect(qs2.amps[1].abs2()).toBeCloseTo(0.5);
    });

    it('round-trips multi-qubit state', () => {
      const qs2 = new QuantumState(2);
      qs2.applySingleGate(GATES.H, 0, 'H');
      qs2.applyTwoQubitGate(GATES2.CNOT, 0, 1, 'CNOT');
      const json = qs2.serialize();
      const qs3 = QuantumState.deserialize(json);
      expect(qs3.n).toBe(2);
      expect(qs3.amps[0].abs2()).toBeCloseTo(0.5);
      expect(qs3.amps[3].abs2()).toBeCloseTo(0.5);
    });

    it('preserves history', () => {
      qs.applySingleGate(GATES.X, 0, 'X');
      qs.applySingleGate(GATES.H, 0, 'H');
      const json = qs.serialize();
      const qs2 = QuantumState.deserialize(json);
      expect(qs2.history).toHaveLength(2);
      expect(qs2.history[0].gate).toBe('X');
    });
  });
});
