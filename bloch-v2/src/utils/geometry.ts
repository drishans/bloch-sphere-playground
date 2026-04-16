/**
 * Geometry generation for the Bloch sphere visualization.
 * Returns typed arrays ready for GPU upload.
 */

export interface SphereGeo {
  vertices: Float32Array;   // interleaved [pos.xyz, normal.xyz] per vertex
  indices: Uint16Array;
}

export function createSphere(radius: number, slices: number, stacks: number): SphereGeo {
  const verts: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= stacks; i++) {
    const theta = (i * Math.PI) / stacks;
    const st = Math.sin(theta), ct = Math.cos(theta);
    for (let j = 0; j <= slices; j++) {
      const phi = (j * 2 * Math.PI) / slices;
      const sp = Math.sin(phi), cp = Math.cos(phi);
      const x = st * cp, y = ct, z = st * sp;
      // position + normal (same for unit sphere)
      verts.push(x * radius, y * radius, z * radius, x, y, z);
    }
  }

  for (let i = 0; i < stacks; i++) {
    for (let j = 0; j < slices; j++) {
      const a = i * (slices + 1) + j;
      const b = a + slices + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  return { vertices: new Float32Array(verts), indices: new Uint16Array(indices) };
}

export function createCircle(radius: number, segments: number): Float32Array {
  const pts: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * 2 * Math.PI;
    pts.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
  }
  return new Float32Array(pts);
}

export function createArrow(from: [number, number, number], to: [number, number, number], headLen = 0.08): Float32Array {
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 1e-10) return new Float32Array(0);
  const ux = dx / len, uy = dy / len, uz = dz / len;

  // Shaft
  const shaft = [from[0], from[1], from[2], to[0] - ux * headLen, to[1] - uy * headLen, to[2] - uz * headLen];

  // Perpendicular vector for arrowhead
  let px: number, py: number, pz: number;
  if (Math.abs(ux) < 0.9) { px = 0; py = -uz; pz = uy; }
  else { px = -uz; py = 0; pz = ux; }
  const plen = Math.sqrt(px * px + py * py + pz * pz);
  px /= plen; py /= plen; pz /= plen;

  const hb = [to[0] - ux * headLen, to[1] - uy * headLen, to[2] - uz * headLen];
  const hs = headLen * 0.4;

  return new Float32Array([
    ...shaft,
    to[0], to[1], to[2], hb[0] + px * hs, hb[1] + py * hs, hb[2] + pz * hs,
    to[0], to[1], to[2], hb[0] - px * hs, hb[1] - py * hs, hb[2] - pz * hs,
  ]);
}
