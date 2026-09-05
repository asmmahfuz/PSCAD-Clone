use serde::{Deserialize, Serialize};

/// GPU Compute Pipeline Configuration & Dispatch Metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuComputeConfig {
    pub workgroup_size_x: u32,
    pub workgroup_size_y: u32,
    pub num_instances: usize,
    pub dt: f64,
    pub t_max: f64,
    pub total_steps: usize,
}

impl Default for GpuComputeConfig {
    fn default() -> Self {
        Self {
            workgroup_size_x: 64,
            workgroup_size_y: 1,
            num_instances: 1024,
            dt: 5e-5,
            t_max: 0.2,
            total_steps: 4000,
        }
    }
}

/// GPU Compute Pipeline Manager
pub struct NativeGpuComputePipeline {
    pub config: GpuComputeConfig,
    pub is_available: bool,
}

impl NativeGpuComputePipeline {
    pub fn new(config: GpuComputeConfig) -> Self {
        Self {
            config,
            is_available: true,
        }
    }

    /// Calculate required workgroup dispatches
    pub fn calculate_workgroups(&self) -> (u32, u32, u32) {
        let size_x = self.config.workgroup_size_x.max(1);
        let count_x = ((self.config.num_instances as u32) + size_x - 1) / size_x;
        (count_x, 1, 1)
    }
}
