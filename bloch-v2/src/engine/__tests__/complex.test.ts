import { describe, it, expect } from 'vitest';
import { Complex, C, ZERO, ONE, I_C, SQRT2_INV, formatComplex, formatAngle } from '../complex';

describe('Complex', () => {
  describe('construction', () => {
    it('defaults to 0+0i', () => {
      const c = new Complex();
      expect(c.re).toBe(0);
      expect(c.im).toBe(0);
    });

    it('C() shorthand works', () => {
      const c = C(3, 4);
      expect(c.re).toBe(3);
      expect(c.im).toBe(4);
    });

    it('C() with single arg defaults im to 0', () => {
      const c = C(5);
      expect(c.im).toBe(0);
    });
  });

  describe('arithmetic', () => {
    it('adds two complex numbers', () => {
      const r = C(1, 2).add(C(3, 4));
      expect(r.re).toBe(4);
      expect(r.im).toBe(6);
    });

    it('subtracts two complex numbers', () => {
      const r = C(5, 3).sub(C(2, 1));
      expect(r.re).toBe(3);
      expect(r.im).toBe(2);
    });

    it('multiplies (1+2i)(3+4i) = -5+10i', () => {
      const r = C(1, 2).mul(C(3, 4));
      expect(r.re).toBeCloseTo(-5);
      expect(r.im).toBeCloseTo(10);
    });

    it('multiplies i*i = -1', () => {
      const r = I_C.mul(I_C);
      expect(r.re).toBeCloseTo(-1);
      expect(r.im).toBeCloseTo(0);
    });

    it('scales by real number', () => {
      const r = C(2, 3).scale(2);
      expect(r.re).toBe(4);
      expect(r.im).toBe(6);
    });

    it('conjugate flips imaginary sign', () => {
      const r = C(1, 2).conj();
      expect(r.re).toBe(1);
      expect(r.im).toBe(-2);
    });
  });

  describe('abs and phase', () => {
    it('abs2 of 3+4i is 25', () => {
      expect(C(3, 4).abs2()).toBe(25);
    });

    it('abs of 3+4i is 5', () => {
      expect(C(3, 4).abs()).toBe(5);
    });

    it('phase of 1+0i is 0', () => {
      expect(C(1, 0).phase()).toBeCloseTo(0);
    });

    it('phase of 0+1i is pi/2', () => {
      expect(I_C.phase()).toBeCloseTo(Math.PI / 2);
    });

    it('phase of -1+0i is pi', () => {
      expect(C(-1, 0).phase()).toBeCloseTo(Math.PI);
    });
  });

  describe('constants', () => {
    it('ZERO is 0', () => {
      expect(ZERO.re).toBe(0);
      expect(ZERO.im).toBe(0);
    });

    it('ONE is 1', () => {
      expect(ONE.re).toBe(1);
      expect(ONE.im).toBe(0);
    });

    it('I_C is i', () => {
      expect(I_C.re).toBe(0);
      expect(I_C.im).toBe(1);
    });

    it('SQRT2_INV is 1/sqrt(2)', () => {
      expect(SQRT2_INV.re).toBeCloseTo(1 / Math.sqrt(2));
      expect(SQRT2_INV.im).toBe(0);
    });
  });

  describe('toString', () => {
    it('real only', () => {
      expect(C(1.5, 0).toString()).toBe('1.500');
    });

    it('imaginary only', () => {
      expect(C(0, 2.5).toString()).toBe('2.500i');
    });

    it('both', () => {
      expect(C(1, 2).toString()).toBe('1.000+2.000i');
    });

    it('negative imaginary', () => {
      expect(C(1, -2).toString()).toBe('1.000-2.000i');
    });
  });
});

describe('formatComplex', () => {
  it('formats zero', () => {
    expect(formatComplex(C(0, 0))).toBe('0');
  });

  it('formats 1', () => {
    expect(formatComplex(C(1, 0))).toBe('1');
  });

  it('formats -1', () => {
    expect(formatComplex(C(-1, 0))).toBe('-1');
  });

  it('formats 1/sqrt(2)', () => {
    expect(formatComplex(SQRT2_INV)).toBe('1/\u221A2');
  });

  it('formats -1/sqrt(2)', () => {
    expect(formatComplex(SQRT2_INV.scale(-1))).toBe('-1/\u221A2');
  });

  it('formats pure imaginary 1/sqrt(2)i', () => {
    expect(formatComplex(C(0, 1 / Math.sqrt(2)))).toBe('1/\u221A2i');
  });
});

describe('formatAngle', () => {
  it('formats pi', () => {
    expect(formatAngle(Math.PI)).toBe('\u03C0');
  });

  it('formats pi/2', () => {
    expect(formatAngle(Math.PI / 2)).toBe('\u03C0/2');
  });

  it('formats pi/4', () => {
    expect(formatAngle(Math.PI / 4)).toBe('\u03C0/4');
  });

  it('formats arbitrary angle as decimal', () => {
    expect(formatAngle(1.234)).toBe('1.23');
  });
});
