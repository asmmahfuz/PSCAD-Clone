// PSCAD CLONE - GPU Parallel Bitonic Sort Compute Shader
// O(log^2 N) Parallel sorting network for MMC submodule capacitor voltage balancing

struct BitonicParams {
  num_elements: u32,
  stage: u32,
  pass_step: u32,
  direction: u32, // 1 = ascending (charging), 0 = descending (discharging)
};

struct SubmoduleData {
  sm_id: u32,
  v_cap: f32,
  state: u32, // 0 = bypassed, 1 = inserted, 2 = blocked
  padding: f32,
};

@group(0) @binding(0) var<uniform> params: BitonicParams;
@group(0) @binding(1) var<storage, read_write> submodules: array<SubmoduleData>;

// Workgroup size 256 for fast parallel shared memory sorting
var<workgroup> shared_sm: array<SubmoduleData, 256>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>, @builtin(local_invocation_id) local_id: vec3<u32>) {
  let i = global_id.x;
  let n = params.num_elements;
  if (i >= n) {
    return;
  }

  let stage = params.stage;
  let step = params.pass_step;
  let dir = params.direction;

  let partner = i ^ step;

  if (partner > i && partner < n) {
    let sm_a = submodules[i];
    let sm_b = submodules[partner];

    // Determine sorting direction for this stage block
    let block_dir = select(dir == 1u, (i & stage) == 0u, stage > 0u);

    // Compare and swap
    let should_swap = select(sm_a.v_cap < sm_b.v_cap, sm_a.v_cap > sm_b.v_cap, block_dir);

    if (should_swap) {
      submodules[i] = sm_b;
      submodules[partner] = sm_a;
    }
  }
}
