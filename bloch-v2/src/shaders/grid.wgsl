// Grid / wireframe shader for equator and meridians.
// Same as line shader but with dashed line support via world position.

struct Uniforms {
  mvp: mat4x4f,
  color: vec3f,
  alpha: f32,
  dashScale: f32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) worldPos: vec3f,
};

@vertex
fn vs(@location(0) position: vec3f) -> VSOut {
  var out: VSOut;
  out.worldPos = position;
  out.pos = u.mvp * vec4f(position, 1.0);
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  // Optional dash pattern based on arc-length approximation
  let arcParam = atan2(in.worldPos.z, in.worldPos.x) * u.dashScale;
  let dashFactor = smoothstep(0.3, 0.5, fract(arcParam));
  let a = u.alpha * mix(0.4, 1.0, dashFactor);
  return vec4f(u.color, a);
}
