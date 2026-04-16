// Line / point shader for axes, state vectors, trails, and grid circles.
// Minimal shader: transforms position and applies flat color.

struct Uniforms {
  mvp: mat4x4f,
  color: vec3f,
  alpha: f32,
  pointSize: f32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VSOut {
  @builtin(position) pos: vec4f,
};

@vertex
fn vs(@location(0) position: vec3f) -> VSOut {
  var out: VSOut;
  out.pos = u.mvp * vec4f(position, 1.0);
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  return vec4f(u.color, u.alpha);
}
