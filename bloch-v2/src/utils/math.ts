/**
 * 4x4 matrix math and geometry generation utilities.
 * All matrices are column-major Float32Arrays (GPU standard).
 */

export function mat4Identity(): Float32Array {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

export function mat4Perspective(fov: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}

export function mat4LookAt(eye: [number, number, number], center: [number, number, number], up: [number, number, number]): Float32Array {
  const zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
  let len = Math.sqrt(zx * zx + zy * zy + zz * zz);
  const fz = [zx / len, zy / len, zz / len];
  const sx = up[1] * fz[2] - up[2] * fz[1], sy = up[2] * fz[0] - up[0] * fz[2], sz = up[0] * fz[1] - up[1] * fz[0];
  len = Math.sqrt(sx * sx + sy * sy + sz * sz);
  const fx = [sx / len, sy / len, sz / len];
  const fu = [fz[1] * fx[2] - fz[2] * fx[1], fz[2] * fx[0] - fz[0] * fx[2], fz[0] * fx[1] - fz[1] * fx[0]];
  return new Float32Array([
    fx[0], fu[0], fz[0], 0,
    fx[1], fu[1], fz[1], 0,
    fx[2], fu[2], fz[2], 0,
    -(fx[0] * eye[0] + fx[1] * eye[1] + fx[2] * eye[2]),
    -(fu[0] * eye[0] + fu[1] * eye[1] + fu[2] * eye[2]),
    -(fz[0] * eye[0] + fz[1] * eye[1] + fz[2] * eye[2]),
    1,
  ]);
}

export function mat4Mul(a: Float32Array, b: Float32Array): Float32Array {
  const o = new Float32Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
      o[i * 4 + j] = s;
    }
  return o;
}

export function mat4RotateX(m: Float32Array, a: number): Float32Array {
  const c = Math.cos(a), s = Math.sin(a);
  const r = new Float32Array(16);
  r[0] = 1; r[5] = c; r[6] = s; r[9] = -s; r[10] = c; r[15] = 1;
  return mat4Mul(m, r);
}

export function mat4RotateZ(m: Float32Array, a: number): Float32Array {
  const c = Math.cos(a), s = Math.sin(a);
  const r = new Float32Array(16);
  r[0] = c; r[1] = s; r[4] = -s; r[5] = c; r[10] = 1; r[15] = 1;
  return mat4Mul(m, r);
}

/** Project 3D point to 2D canvas coordinates */
export function project3Dto2D(
  mvp: Float32Array,
  point: [number, number, number],
  width: number,
  height: number
): { x: number; y: number } {
  const x = mvp[0] * point[0] + mvp[4] * point[1] + mvp[8] * point[2] + mvp[12];
  const y = mvp[1] * point[0] + mvp[5] * point[1] + mvp[9] * point[2] + mvp[13];
  const w = mvp[3] * point[0] + mvp[7] * point[1] + mvp[11] * point[2] + mvp[15];
  return {
    x: (x / w * 0.5 + 0.5) * width,
    y: (1 - (y / w * 0.5 + 0.5)) * height,
  };
}
