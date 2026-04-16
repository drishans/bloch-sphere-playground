import { describe, it, expect } from 'vitest';
import {
  mat4Identity, mat4Perspective, mat4LookAt, mat4Mul,
  mat4RotateX, mat4RotateZ, project3Dto2D,
} from '../math';

describe('mat4Identity', () => {
  it('returns 4x4 identity matrix', () => {
    const m = mat4Identity();
    expect(m.length).toBe(16);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        expect(m[i * 4 + j]).toBeCloseTo(i === j ? 1 : 0);
  });
});

describe('mat4Mul', () => {
  it('identity * identity = identity', () => {
    const I = mat4Identity();
    const result = mat4Mul(I, I);
    for (let i = 0; i < 16; i++) expect(result[i]).toBeCloseTo(I[i]);
  });

  it('identity * M = M', () => {
    const I = mat4Identity();
    const M = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    const result = mat4Mul(I, M);
    for (let i = 0; i < 16; i++) expect(result[i]).toBeCloseTo(M[i]);
  });

  it('M * identity = M', () => {
    const I = mat4Identity();
    const M = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    const result = mat4Mul(M, I);
    for (let i = 0; i < 16; i++) expect(result[i]).toBeCloseTo(M[i]);
  });
});

describe('mat4Perspective', () => {
  it('produces a valid perspective matrix', () => {
    const m = mat4Perspective(Math.PI / 4, 1.5, 0.1, 100);
    expect(m.length).toBe(16);
    // Should have -1 in position [11] (column 2, row 3) for right-handed perspective
    expect(m[11]).toBeCloseTo(-1);
    // [15] should be 0
    expect(m[15]).toBeCloseTo(0);
    // Aspect ratio affects m[0]
    expect(m[0]).not.toBe(0);
    expect(m[5]).not.toBe(0);
  });

  it('fov=90deg gives f/aspect for m[0]', () => {
    const aspect = 2;
    const m = mat4Perspective(Math.PI / 2, aspect, 0.1, 100);
    const f = 1 / Math.tan(Math.PI / 4);
    expect(m[0]).toBeCloseTo(f / aspect);
    expect(m[5]).toBeCloseTo(f);
  });
});

describe('mat4LookAt', () => {
  it('looking down -Z from origin produces expected structure', () => {
    const m = mat4LookAt([0, 0, 5], [0, 0, 0], [0, 1, 0]);
    expect(m.length).toBe(16);
    // View matrix should not be identity
    expect(m[14]).not.toBeCloseTo(0); // translation along Z
  });

  it('result is a proper 4x4 matrix', () => {
    const m = mat4LookAt([3, 3, 3], [0, 0, 0], [0, 1, 0]);
    expect(m.length).toBe(16);
    // w row should be [0, 0, 0, 1] conceptually but it's column-major
    expect(m[3]).toBeCloseTo(0);
    expect(m[7]).toBeCloseTo(0);
    expect(m[11]).toBeCloseTo(0);
    expect(m[15]).toBeCloseTo(1);
  });
});

describe('mat4RotateX', () => {
  it('rotation by 0 returns original matrix', () => {
    const I = mat4Identity();
    const r = mat4RotateX(I, 0);
    for (let i = 0; i < 16; i++) expect(r[i]).toBeCloseTo(I[i], 5);
  });

  it('rotation by 2π returns identity', () => {
    const I = mat4Identity();
    const r = mat4RotateX(I, Math.PI * 2);
    for (let i = 0; i < 16; i++) expect(r[i]).toBeCloseTo(I[i], 4);
  });

  it('rotation by π/2 swaps Y and Z components', () => {
    const I = mat4Identity();
    const r = mat4RotateX(I, Math.PI / 2);
    // Column 1 (Y) should go to Z: [0, cos, sin, 0] = [0, 0, 1, 0]
    expect(r[5]).toBeCloseTo(0, 5);
    expect(r[6]).toBeCloseTo(1, 5);
  });
});

describe('mat4RotateZ', () => {
  it('rotation by 0 returns original matrix', () => {
    const I = mat4Identity();
    const r = mat4RotateZ(I, 0);
    for (let i = 0; i < 16; i++) expect(r[i]).toBeCloseTo(I[i], 5);
  });

  it('rotation by π/2 swaps X and Y', () => {
    const I = mat4Identity();
    const r = mat4RotateZ(I, Math.PI / 2);
    // Column 0: [cos, sin, 0, 0] = [0, 1, 0, 0]
    expect(r[0]).toBeCloseTo(0, 5);
    expect(r[1]).toBeCloseTo(1, 5);
  });
});

describe('project3Dto2D', () => {
  it('origin projects to center of screen with identity MVP', () => {
    // Identity won't produce a useful projection, but let's test with a simple VP
    const I = mat4Identity();
    const p = project3Dto2D(I, [0, 0, 0], 800, 600);
    // With identity matrix, w=1, x=0, y=0 → center
    expect(p.x).toBeCloseTo(400);
    expect(p.y).toBeCloseTo(300);
  });

  it('positive x maps to right side of screen', () => {
    const I = mat4Identity();
    const pCenter = project3Dto2D(I, [0, 0, 0], 800, 600);
    const pRight = project3Dto2D(I, [0.5, 0, 0], 800, 600);
    expect(pRight.x).toBeGreaterThan(pCenter.x);
  });

  it('positive y maps to upper side of screen', () => {
    const I = mat4Identity();
    const pCenter = project3Dto2D(I, [0, 0, 0], 800, 600);
    const pUp = project3Dto2D(I, [0, 0.5, 0], 800, 600);
    expect(pUp.y).toBeLessThan(pCenter.y);
  });
});
