/**
 * Complex number arithmetic for quantum state manipulation.
 */
export class Complex {
  constructor(public re: number = 0, public im: number = 0) {}

  add(c: Complex): Complex { return new Complex(this.re + c.re, this.im + c.im); }
  sub(c: Complex): Complex { return new Complex(this.re - c.re, this.im - c.im); }
  mul(c: Complex): Complex {
    return new Complex(
      this.re * c.re - this.im * c.im,
      this.re * c.im + this.im * c.re
    );
  }
  scale(s: number): Complex { return new Complex(this.re * s, this.im * s); }
  conj(): Complex { return new Complex(this.re, -this.im); }
  abs2(): number { return this.re * this.re + this.im * this.im; }
  abs(): number { return Math.sqrt(this.abs2()); }
  phase(): number { return Math.atan2(this.im, this.re); }

  toString(prec = 3): string {
    const r = this.re, i = this.im;
    if (Math.abs(i) < 1e-10) return r.toFixed(prec);
    if (Math.abs(r) < 1e-10) return `${i.toFixed(prec)}i`;
    return `${r.toFixed(prec)}${i >= 0 ? '+' : ''}${i.toFixed(prec)}i`;
  }
}

// Convenience constructors
export const C = (re: number, im = 0) => new Complex(re, im);
export const ZERO = C(0);
export const ONE = C(1);
export const I_C = C(0, 1);
export const SQRT2_INV = C(1 / Math.sqrt(2));

/** Format complex number with nice fractions */
export function formatComplex(c: Complex): string {
  const r = c.re, i = c.im;
  if (Math.abs(r) < 1e-6 && Math.abs(i) < 1e-6) return '0';
  const sqrt2inv = 1 / Math.sqrt(2);
  const nice = (v: number): string => {
    if (Math.abs(v - 1) < 1e-4) return '1';
    if (Math.abs(v + 1) < 1e-4) return '-1';
    if (Math.abs(v - sqrt2inv) < 1e-4) return '1/\u221A2';
    if (Math.abs(v + sqrt2inv) < 1e-4) return '-1/\u221A2';
    if (Math.abs(v - 0.5) < 1e-4) return '1/2';
    if (Math.abs(v + 0.5) < 1e-4) return '-1/2';
    return v.toFixed(3);
  };
  if (Math.abs(i) < 1e-6) return nice(r);
  if (Math.abs(r) < 1e-6) return `${nice(i)}i`;
  return `${nice(r)}${i >= 0 ? '+' : ''}${nice(i)}i`;
}

/** Format angle with pi fractions */
export function formatAngle(rad: number): string {
  const pi = Math.PI;
  const fracs: [number, string][] = [
    [1, '\u03C0'], [0.5, '\u03C0/2'], [0.25, '\u03C0/4'], [0.75, '3\u03C0/4'],
    [1 / 3, '\u03C0/3'], [2 / 3, '2\u03C0/3'], [1 / 6, '\u03C0/6'],
    [2, '2\u03C0'], [1.5, '3\u03C0/2'],
  ];
  for (const [f, label] of fracs) {
    if (Math.abs(rad - f * pi) < 0.02) return label;
  }
  return rad.toFixed(2);
}
