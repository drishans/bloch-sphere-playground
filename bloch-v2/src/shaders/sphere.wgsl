// Bloch Sphere - Solid mesh shader with lighting
// This shader renders the translucent sphere with Blinn-Phong shading.

struct Uniforms {
  mvp: mat4x4f,
  model: mat4x4f,
  color: vec3f,
  alpha: f32,
  lightDir: vec3f,
  _pad: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) normal: vec3f,
  @location(1) worldPos: vec3f,
};

@vertex
fn vs(@location(0) position: vec3f, @location(1) normal: vec3f) -> VSOut {
  var out: VSOut;
  out.normal = (u.model * vec4f(normal, 0.0)).xyz;
  out.worldPos = (u.model * vec4f(position, 1.0)).xyz;
  out.pos = u.mvp * vec4f(position, 1.0);
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  let n = normalize(in.normal);
  let l = normalize(u.lightDir);
  let diff = max(dot(n, l), 0.0);
  let ambient = 0.25;
  let col = u.color * (ambient + diff * 0.75);
  return vec4f(col, u.alpha);
}
