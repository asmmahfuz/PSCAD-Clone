// PSCAD Modern - WebGPU Oscilloscope Waveform Vertex & Fragment Shader
// High-performance hardware-accelerated vertex streaming for 10,000,000+ data points

struct UniformParams {
  t_min: f32,
  t_max: f32,
  v_min: f32,
  v_max: f32,
  screen_width: f32,
  screen_height: f32,
  channel_color: vec4<f32>,
};

struct VertexInput {
  @location(0) time: f32,
  @location(1) value: f32,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: UniformParams;

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;

  // Normalized Device Coordinates (NDC) mapping
  let t_span = max(1e-6, uniforms.t_max - uniforms.t_min);
  let v_span = max(1e-6, uniforms.v_max - uniforms.v_min);

  let x_norm = (in.time - uniforms.t_min) / t_span; // [0, 1]
  let y_norm = (in.value - uniforms.v_min) / v_span; // [0, 1]

  let x_ndc = x_norm * 2.0 - 1.0; // [-1, 1]
  let y_ndc = y_norm * 2.0 - 1.0; // [-1, 1]

  out.position = vec4<f32>(x_ndc, y_ndc, 0.0, 1.0);
  out.color = uniforms.channel_color;

  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  return in.color;
}
