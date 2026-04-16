import { describe, it, expect } from 'vitest';
import { createSphere, createCircle, createArrow } from '../geometry';

describe('createSphere', () => {
  it('returns non-empty vertices and indices', () => {
    const geo = createSphere(1.0, 8, 4);
    expect(geo.vertices.length).toBeGreaterThan(0);
    expect(geo.indices.length).toBeGreaterThan(0);
  });

  it('vertices have 6 floats per vertex (pos + normal)', () => {
    const geo = createSphere(1.0, 8, 4);
    expect(geo.vertices.length % 6).toBe(0);
  });

  it('vertex count matches (stacks+1) * (slices+1)', () => {
    const slices = 8, stacks = 4;
    const geo = createSphere(1.0, slices, stacks);
    const numVerts = (stacks + 1) * (slices + 1);
    expect(geo.vertices.length / 6).toBe(numVerts);
  });

  it('index count matches stacks * slices * 6', () => {
    const slices = 8, stacks = 4;
    const geo = createSphere(1.0, slices, stacks);
    expect(geo.indices.length).toBe(stacks * slices * 6);
  });

  it('all indices are within vertex count', () => {
    const geo = createSphere(1.0, 8, 4);
    const numVerts = geo.vertices.length / 6;
    for (let i = 0; i < geo.indices.length; i++) {
      expect(geo.indices[i]).toBeLessThan(numVerts);
    }
  });

  it('normals are approximately unit length', () => {
    const geo = createSphere(1.0, 8, 4);
    const numVerts = geo.vertices.length / 6;
    for (let i = 0; i < numVerts; i++) {
      const nx = geo.vertices[i * 6 + 3];
      const ny = geo.vertices[i * 6 + 4];
      const nz = geo.vertices[i * 6 + 5];
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      expect(len).toBeCloseTo(1.0, 3);
    }
  });

  it('positions are at the given radius', () => {
    const radius = 2.5;
    const geo = createSphere(radius, 12, 8);
    const numVerts = geo.vertices.length / 6;
    for (let i = 0; i < numVerts; i++) {
      const px = geo.vertices[i * 6 + 0];
      const py = geo.vertices[i * 6 + 1];
      const pz = geo.vertices[i * 6 + 2];
      const dist = Math.sqrt(px * px + py * py + pz * pz);
      expect(dist).toBeCloseTo(radius, 3);
    }
  });
});

describe('createCircle', () => {
  it('returns correct number of points', () => {
    const segments = 10;
    const pts = createCircle(1.0, segments);
    expect(pts.length / 3).toBe(segments + 1);
  });

  it('all points lie on XZ plane (y=0)', () => {
    const pts = createCircle(1.0, 16);
    for (let i = 0; i < pts.length / 3; i++) {
      expect(pts[i * 3 + 1]).toBeCloseTo(0);
    }
  });

  it('all points are at the given radius', () => {
    const radius = 2.0;
    const pts = createCircle(radius, 16);
    for (let i = 0; i < pts.length / 3; i++) {
      const x = pts[i * 3 + 0];
      const z = pts[i * 3 + 2];
      expect(Math.sqrt(x * x + z * z)).toBeCloseTo(radius, 3);
    }
  });

  it('first and last points coincide (closed loop)', () => {
    const pts = createCircle(1.0, 10);
    const n = pts.length / 3;
    expect(pts[0]).toBeCloseTo(pts[(n - 1) * 3 + 0], 5);
    expect(pts[1]).toBeCloseTo(pts[(n - 1) * 3 + 1], 5);
    expect(pts[2]).toBeCloseTo(pts[(n - 1) * 3 + 2], 5);
  });
});

describe('createArrow', () => {
  it('returns data for shaft + 2 head lines (6 vertices = 18 floats)', () => {
    const data = createArrow([0, 0, 0], [1, 0, 0]);
    expect(data.length).toBe(18); // 6 vertices * 3 floats
  });

  it('returns empty array for zero-length arrow', () => {
    const data = createArrow([0, 0, 0], [0, 0, 0]);
    expect(data.length).toBe(0);
  });

  it('shaft starts at from point', () => {
    const data = createArrow([1, 2, 3], [4, 5, 6]);
    expect(data[0]).toBeCloseTo(1);
    expect(data[1]).toBeCloseTo(2);
    expect(data[2]).toBeCloseTo(3);
  });

  it('arrowhead tip is at the to point', () => {
    const to: [number, number, number] = [3, 0, 0];
    const data = createArrow([0, 0, 0], to);
    // Vertices 2 and 4 (indices 6,7,8 and 12,13,14) are arrowhead line starts (the tip)
    expect(data[6]).toBeCloseTo(to[0]);
    expect(data[7]).toBeCloseTo(to[1]);
    expect(data[8]).toBeCloseTo(to[2]);
    expect(data[12]).toBeCloseTo(to[0]);
    expect(data[13]).toBeCloseTo(to[1]);
    expect(data[14]).toBeCloseTo(to[2]);
  });

  it('works along different axes', () => {
    for (const dir of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1]] as [number, number, number][]) {
      const data = createArrow([0, 0, 0], dir);
      expect(data.length).toBe(18);
    }
  });
});
