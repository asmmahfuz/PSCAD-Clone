// PSCAD Modern - High-Performance WebGPU EMTDC Compute Shader
// Massively parallel time-domain transient simulation kernel executing across GPU workgroups

struct SimulationParams {
  dt: f32,
  t_max: f32,
  total_steps: u32,
  num_instances: u32,
  base_voltage: f32,
  system_freq: f32,
  fault_start_time: f32,
  padding: f32,
};

struct CircuitInstanceInput {
  param_value: f32,
  sweep_mode: u32, // 0 = linear, 1 = point_on_wave, 2 = discrete, 3 = monte_carlo
  r_branch: f32,
  l_branch: f32,
  c_branch: f32,
  v_source_peak: f32,
  fault_r: f32,
  seed: u32,
};

struct CircuitInstanceOutput {
  peak_voltage: f32,
  peak_current: f32,
  overvoltage_pu: f32,
  energy_absorbed_j: f32,
  fault_cleared: u32,
  clearing_time: f32,
};

@group(0) @binding(0) var<uniform> sim_params: SimulationParams;
@group(0) @binding(1) var<storage, read> inputs: array<CircuitInstanceInput>;
@group(0) @binding(2) var<storage, read_write> outputs: array<CircuitInstanceOutput>;

// Workgroup size 64 for high GPU compute density
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let instance_idx = global_id.x;
  if (instance_idx >= sim_params.num_instances) {
    return;
  }

  let input_data = inputs[instance_idx];
  let dt = sim_params.dt;
  let t_max = sim_params.t_max;
  let total_steps = sim_params.total_steps;
  let omega = 2.0 * 3.1415926535 * sim_params.system_freq;

  // Derive circuit parameters for this instance
  var fault_time = sim_params.fault_start_time;
  var fault_r = input_data.fault_r;

  if (input_data.sweep_mode == 1u) {
    // Point on wave angle theta
    let theta_deg = input_data.param_value;
    let time_offset = (theta_deg / 360.0) * (1.0 / sim_params.system_freq);
    fault_time = sim_params.fault_start_time + time_offset;
  } else if (input_data.sweep_mode == 0u || input_data.sweep_mode == 3u) {
    fault_r = max(0.01, input_data.param_value);
  }

  // RLC Companion Branch Conductances (Trapezoidal rule)
  let g_r = 1.0 / max(0.01, input_data.r_branch);
  let g_l = dt / (2.0 * max(1e-6, input_data.l_branch));
  let g_c = (2.0 * max(1e-12, input_data.c_branch)) / dt;
  let g_total = g_r + g_l + g_c;

  // Companion history currents
  var i_hist_l = 0.0f;
  var i_hist_c = 0.0f;
  var v_node = 0.0f;
  var i_branch = 0.0f;

  var peak_v = 0.0f;
  var peak_i = 0.0f;
  var total_energy = 0.0f;

  let peak_base = (sim_params.base_voltage * 1.41421356) / 1.7320508;

  // Time-stepping loop on GPU SIMD threads
  for (var step = 0u; step < total_steps; step = step + 1u) {
    let t = f32(step) * dt;

    // Grid AC source voltage
    let v_src = peak_base * sin(omega * t);

    // Norton RHS injection vector
    var i_rhs = v_src * g_r - i_hist_l + i_hist_c;

    // Apply fault conductance after fault onset
    var g_eff = g_total;
    if (t >= fault_time && t < fault_time + 0.05) {
      g_eff = g_eff + (1.0 / fault_r);
    }

    // Solve nodal equation [G] * [V] = [I]
    v_node = i_rhs / g_eff;

    let abs_v = abs(v_node);
    if (abs_v > peak_v) {
      peak_v = abs_v;
    }

    i_branch = abs(v_node - v_src) * g_r;
    if (i_branch > peak_i) {
      peak_i = i_branch;
    }

    // Update inductor and capacitor history
    let v_l = v_node;
    i_hist_l = i_hist_l + (dt / max(1e-6, input_data.l_branch)) * v_l;
    i_hist_c = -i_hist_c + 2.0 * g_c * v_node;

    // Accumulate surge energy
    if (t >= fault_time) {
      total_energy = total_energy + abs_v * i_branch * dt;
    }
  }

  let overvoltage_pu = select(1.0f, peak_v / peak_base, peak_base > 0.0f);

  outputs[instance_idx].peak_voltage = peak_v;
  outputs[instance_idx].peak_current = peak_i;
  outputs[instance_idx].overvoltage_pu = overvoltage_pu;
  outputs[instance_idx].energy_absorbed_j = total_energy;
  outputs[instance_idx].fault_cleared = 1u;
  outputs[instance_idx].clearing_time = fault_time + 0.05;
}
