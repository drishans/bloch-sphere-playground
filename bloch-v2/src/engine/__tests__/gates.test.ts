import { describe, it, expect } from 'vitest';
import { GATES, GATES2, rotationGate, GATE_INFO } from '../gates';
import { C, ONE, ZERO, SQRT2_INV } from '../complex';
import type { Gate2x2 } from '../gates';

// Helper: apply 2x2 matrix to [a, b] state vector
function apply2x2(m: Gate2x2, state: [typeof ONE, typeof ZERO]): [typeof ONE, typeof ZERO] {
  return [
    m[0].mul(state[0]).add(m[1].mul(state[1])),
    m[2].mul(state[0]).add(m[3].mul(state[1])),
  ];
}

// Helper: check if gate is unitary (M * M† = I)
function isUnitary(m: Gate2x2): boolean {
  // M† (conjugate transpose)
  const md: Gate2x2 = [m[0].conj(), m[2].conj(), m[1].conj(), m[3].conj()];
  // Product M * M†
  const p00 = m[0].mul(md[0]).add(m[1].mul(md[2]));
  const p01 = m[0].mul(md[1]).add(m[1].mul(md[3]));
  const p10 = m[2].mul(md[0]).add(m[3].mul(md[2]));
  const p11 = m[2].mul(md[1]).add(m[3].mul(md[3]));
  return (
    Math.abs(p00.re - 1) < 1e-8 && Math.abs(p00.im) < 1e-8 &&
    Math.abs(p01.re) < 1e-8 && Math.abs(p01.im) < 1e-8 &&
    Math.abs(p10.re) < 1e-8 && Math.abs(p10.im) < 1e-8 &&
    Math.abs(p11.re - 1) < 1e-8 && Math.abs(p11.im) < 1e-8
  );
}

describe('Single-qubit gates', () => {
  describe('unitarity', () => {
    for (const name of Object.keys(GATES)) {
      it(`${name} is unitary`, () => {
        expect(isUnitary(GATES[name])).toBe(true);
      });
    }
  });

  describe('X gate (NOT)', () => {
    it('flips |0> to |1>', () => {
      const [a, b] = apply2x2(GATES.X, [ONE, ZERO]);
      expect(a.abs2()).toBeCloseTo(0);
      expect(b.abs2()).toBeCloseTo(1);
    });

    it('flips |1> to |0>', () => {
      const [a, b] = apply2x2(GATES.X, [ZERO, ONE]);
      expect(a.abs2()).toBeCloseTo(1);
      expect(b.abs2()).toBeCloseTo(0);
    });

    it('X^2 = I', () => {
      const s1 = apply2x2(GATES.X, [ONE, ZERO]);
      const s2 = apply2x2(GATES.X, s1);
      expect(s2[0].abs2()).toBeCloseTo(1);
      expect(s2[1].abs2()).toBeCloseTo(0);
    });
  });

  describe('Y gate', () => {
    it('maps |0> to i|1>', () => {
      const [a, b] = apply2x2(GATES.Y, [ONE, ZERO]);
      expect(a.abs2()).toBeCloseTo(0);
      expect(b.re).toBeCloseTo(0);
      expect(b.im).toBeCloseTo(1);
    });

    it('Y^2 = I (up to global phase)', () => {
      const s1 = apply2x2(GATES.Y, [ONE, ZERO]);
      const s2 = apply2x2(GATES.Y, s1);
      // Y^2 = -I, so |0> -> -|0>
      expect(s2[0].abs2()).toBeCloseTo(1);
      expect(s2[1].abs2()).toBeCloseTo(0);
    });
  });

  describe('Z gate', () => {
    it('leaves |0> unchanged', () => {
      const [a, b] = apply2x2(GATES.Z, [ONE, ZERO]);
      expect(a.abs2()).toBeCloseTo(1);
      expect(b.abs2()).toBeCloseTo(0);
    });

    it('flips phase of |1>', () => {
      const [a, b] = apply2x2(GATES.Z, [ZERO, ONE]);
      expect(a.abs2()).toBeCloseTo(0);
      expect(b.re).toBeCloseTo(-1);
    });
  });

  describe('H gate (Hadamard)', () => {
    it('maps |0> to |+> = (|0>+|1>)/sqrt(2)', () => {
      const [a, b] = apply2x2(GATES.H, [ONE, ZERO]);
      expect(a.re).toBeCloseTo(1 / Math.sqrt(2));
      expect(b.re).toBeCloseTo(1 / Math.sqrt(2));
    });

    it('maps |1> to |-> = (|0>-|1>)/sqrt(2)', () => {
      const [a, b] = apply2x2(GATES.H, [ZERO, ONE]);
      expect(a.re).toBeCloseTo(1 / Math.sqrt(2));
      expect(b.re).toBeCloseTo(-1 / Math.sqrt(2));
    });

    it('H^2 = I', () => {
      const s1 = apply2x2(GATES.H, [ONE, ZERO]);
      const s2 = apply2x2(GATES.H, s1);
      expect(s2[0].re).toBeCloseTo(1);
      expect(s2[1].abs2()).toBeCloseTo(0);
    });
  });

  describe('S gate', () => {
    it('S^2 = Z', () => {
      const s1 = apply2x2(GATES.S, [ZERO, ONE]);
      const s2 = apply2x2(GATES.S, [s1[0], s1[1]]);
      // S^2|1> should equal Z|1> = -|1>
      expect(s2[0].abs2()).toBeCloseTo(0);
      expect(s2[1].re).toBeCloseTo(-1);
    });
  });

  describe('T gate', () => {
    it('T^2 = S', () => {
      const t1 = apply2x2(GATES.T, [ZERO, ONE]);
      const t2 = apply2x2(GATES.T, [t1[0], t1[1]]);
      const s1 = apply2x2(GATES.S, [ZERO, ONE]);
      expect(t2[1].re).toBeCloseTo(s1[1].re, 4);
      expect(t2[1].im).toBeCloseTo(s1[1].im, 4);
    });
  });

  describe('S-dagger and T-dagger', () => {
    it('S * Sd = I on |1>', () => {
      const s1 = apply2x2(GATES.S, [ZERO, ONE]);
      const s2 = apply2x2(GATES.Sd, [s1[0], s1[1]]);
      // S|1> = i|1>, Sd(i|1>) = i * (-i)|1> = |1>
      expect(s2[0].abs2()).toBeCloseTo(0);
      expect(s2[1].re).toBeCloseTo(1);
      expect(s2[1].im).toBeCloseTo(0);
    });

    it('Sd is unitary', () => {
      expect(isUnitary(GATES.Sd)).toBe(true);
    });

    it('Td is unitary', () => {
      expect(isUnitary(GATES.Td)).toBe(true);
    });
  });
});

describe('Rotation gates', () => {
  it('Rx(pi) is equivalent to X (up to global phase)', () => {
    const rx = rotationGate('x', Math.PI);
    const [a, b] = apply2x2(rx, [ONE, ZERO]);
    // Should give |1> up to global phase -i
    expect(a.abs2()).toBeCloseTo(0);
    expect(b.abs2()).toBeCloseTo(1);
  });

  it('Ry(pi) is equivalent to Y (up to global phase)', () => {
    const ry = rotationGate('y', Math.PI);
    const [a, b] = apply2x2(ry, [ONE, ZERO]);
    expect(a.abs2()).toBeCloseTo(0);
    expect(b.abs2()).toBeCloseTo(1);
  });

  it('Rz(pi) is equivalent to Z (up to global phase)', () => {
    const rz = rotationGate('z', Math.PI);
    const [a, b] = apply2x2(rz, [ZERO, ONE]);
    // Z|1> = -|1>; Rz(pi)|1> = e^{i*pi/2}*(-|1>) = same prob
    expect(a.abs2()).toBeCloseTo(0);
    expect(b.abs2()).toBeCloseTo(1);
  });

  it('Rx(0) is identity', () => {
    const rx = rotationGate('x', 0);
    const [a, b] = apply2x2(rx, [ONE, ZERO]);
    expect(a.re).toBeCloseTo(1);
    expect(b.abs2()).toBeCloseTo(0);
  });

  it('Ry(pi/2) creates superposition from |0>', () => {
    const ry = rotationGate('y', Math.PI / 2);
    const [a, b] = apply2x2(ry, [ONE, ZERO]);
    expect(a.abs2()).toBeCloseTo(0.5, 4);
    expect(b.abs2()).toBeCloseTo(0.5, 4);
  });

  it('rotation gates are unitary', () => {
    expect(isUnitary(rotationGate('x', 1.23))).toBe(true);
    expect(isUnitary(rotationGate('y', 0.77))).toBe(true);
    expect(isUnitary(rotationGate('z', 2.15))).toBe(true);
  });

  it('custom axis rotation is unitary', () => {
    const rn = rotationGate({ nx: 1, ny: 1, nz: 1 }, Math.PI / 3);
    expect(isUnitary(rn)).toBe(true);
  });

  it('zero-length axis returns identity', () => {
    const rn = rotationGate({ nx: 0, ny: 0, nz: 0 }, Math.PI);
    const [a, b] = apply2x2(rn, [ONE, ZERO]);
    expect(a.re).toBeCloseTo(1);
    expect(b.abs2()).toBeCloseTo(0);
  });
});

describe('Two-qubit gates', () => {
  it('CNOT has correct structure (16 entries)', () => {
    expect(GATES2.CNOT.length).toBe(16);
  });

  it('CZ has correct structure', () => {
    expect(GATES2.CZ.length).toBe(16);
  });

  it('SWAP has correct structure', () => {
    expect(GATES2.SWAP.length).toBe(16);
  });

  it('CNOT|00> = |00>', () => {
    // row 0 of CNOT: [1,0,0,0] * [1,0,0,0]^T = 1
    const m = GATES2.CNOT;
    const result = m[0].mul(ONE).add(m[1].mul(ZERO)).add(m[2].mul(ZERO)).add(m[3].mul(ZERO));
    expect(result.abs2()).toBeCloseTo(1);
  });

  it('CNOT|10> = |11>', () => {
    // input: |10> = [0,0,1,0]
    // row 3: [0,0,1,0] dot [0,0,1,0] = 1
    const m = GATES2.CNOT;
    const result3 = m[12].mul(ZERO).add(m[13].mul(ZERO)).add(m[14].mul(ONE)).add(m[15].mul(ZERO));
    expect(result3.abs2()).toBeCloseTo(1);
  });
});

describe('GATE_INFO', () => {
  it('has info for all single gates', () => {
    for (const name of Object.keys(GATES)) {
      expect(GATE_INFO[name]).toBeDefined();
      expect(GATE_INFO[name].label).toBeTruthy();
      expect(GATE_INFO[name].desc).toBeTruthy();
    }
  });

  it('has info for all two-qubit gates', () => {
    for (const name of Object.keys(GATES2)) {
      expect(GATE_INFO[name]).toBeDefined();
    }
  });
});
