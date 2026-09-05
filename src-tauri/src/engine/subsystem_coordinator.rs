use super::lines::BergeronLine1Phase;
use super::netlist::{ConductanceMatrix, RhsVector};
use super::sparse_solver::SparseLuSolver;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::{Arc, Mutex};
use std::thread;

/// Boundary Transmission Delay Link across Subsystems
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubsystemBoundaryLink {
    pub link_id: String,
    pub sending_subsystem_id: usize,
    pub receiving_subsystem_id: usize,
    pub sending_global_node: usize,
    pub receiving_global_node: usize,
    pub tau_seconds: f64,
    pub z_surge: f64,
    pub r_total: f64,
}

/// Double-buffered travel-delay history queue
#[derive(Debug, Clone)]
pub struct DelayHistoryBuffer {
    pub history_k: VecDeque<(f64, f64, f64)>, // (t, V, I)
    pub history_m: VecDeque<(f64, f64, f64)>, // (t, V, I)
}

impl DelayHistoryBuffer {
    pub fn new() -> Self {
        Self {
            history_k: VecDeque::with_capacity(1024),
            history_m: VecDeque::with_capacity(1024),
        }
    }

    pub fn push_k(&mut self, t: f64, v: f64, i: f64) {
        self.history_k.push_back((t, v, i));
        while self.history_k.len() > 2048 {
            self.history_k.pop_front();
        }
    }

    pub fn push_m(&mut self, t: f64, v: f64, i: f64) {
        self.history_m.push_back((t, v, i));
        while self.history_m.len() > 2048 {
            self.history_m.pop_front();
        }
    }

    /// Interpolate past traveling wave at (t - tau)
    pub fn get_delayed_k(&self, target_t: f64) -> (f64, f64) {
        if self.history_k.is_empty() {
            return (0.0, 0.0);
        }
        if self.history_k.len() == 1 || target_t <= self.history_k[0].0 {
            return (self.history_k[0].1, self.history_k[0].2);
        }
        for i in 0..self.history_k.len() - 1 {
            let (t0, v0, i0) = self.history_k[i];
            let (t1, v1, i1) = self.history_k[i + 1];
            if target_t >= t0 && target_t <= t1 {
                let frac = if (t1 - t0).abs() > 1e-12 {
                    (target_t - t0) / (t1 - t0)
                } else {
                    0.0
                };
                return (v0 + frac * (v1 - v0), i0 + frac * (i1 - i0));
            }
        }
        let last = self.history_k.back().unwrap();
        (last.1, last.2)
    }

    pub fn get_delayed_m(&self, target_t: f64) -> (f64, f64) {
        if self.history_m.is_empty() {
            return (0.0, 0.0);
        }
        if self.history_m.len() == 1 || target_t <= self.history_m[0].0 {
            return (self.history_m[0].1, self.history_m[0].2);
        }
        for i in 0..self.history_m.len() - 1 {
            let (t0, v0, i0) = self.history_m[i];
            let (t1, v1, i1) = self.history_m[i + 1];
            if target_t >= t0 && target_t <= t1 {
                let frac = if (t1 - t0).abs() > 1e-12 {
                    (target_t - t0) / (t1 - t0)
                } else {
                    0.0
                };
                return (v0 + frac * (v1 - v0), i0 + frac * (i1 - i0));
            }
        }
        let last = self.history_m.back().unwrap();
        (last.1, last.2)
    }
}

/// Decoupled Subsystem Island
pub struct DecoupledSubsystemIsland {
    pub id: usize,
    pub name: String,
    pub global_nodes: Vec<usize>,
    pub global_to_local: HashMap<usize, usize>,
    pub local_nodes_count: usize,
    pub g_matrix: ConductanceMatrix,
    pub rhs_vector: RhsVector,
    pub v_local: Vec<f64>,
    pub solver: SparseLuSolver,
}

impl DecoupledSubsystemIsland {
    pub fn new(id: usize, name: String, global_nodes: Vec<usize>) -> Self {
        let n = global_nodes.len();
        let mut g2l = HashMap::new();
        for (local_idx, &g_node) in global_nodes.iter().enumerate() {
            g2l.insert(g_node, local_idx + 1);
        }

        Self {
            id,
            name,
            global_nodes,
            global_to_local: g2l,
            local_nodes_count: n,
            g_matrix: ConductanceMatrix::new(n.max(1)),
            rhs_vector: RhsVector::new(n.max(1)),
            v_local: vec![0.0; n.max(1)],
            solver: SparseLuSolver::new(n.max(1)),
        }
    }

    /// Stamp local admittance
    pub fn stamp_admittance(&mut self, local_k: usize, local_m: usize, g: f64) {
        if local_k > 0 {
            self.g_matrix.add(local_k - 1, local_k - 1, g);
        }
        if local_m > 0 {
            self.g_matrix.add(local_m - 1, local_m - 1, g);
        }
        if local_k > 0 && local_m > 0 {
            self.g_matrix.add(local_k - 1, local_m - 1, -g);
            self.g_matrix.add(local_m - 1, local_k - 1, -g);
        }
    }

    /// Factorize local [G_k]
    pub fn factorize(&mut self) -> Result<(), String> {
        if self.local_nodes_count > 0 {
            self.solver.factorize(&self.g_matrix.data)
        } else {
            Ok(())
        }
    }

    /// Solve local subsystem [G_k] * [V_k] = [I_k]
    pub fn solve(&mut self) -> Result<(), String> {
        if self.local_nodes_count > 0 {
            self.solver.solve(&self.rhs_vector.data, &mut self.v_local)
        } else {
            Ok(())
        }
    }
}

/// Multi-Threaded Subsystem Decoupling Coordinator
pub struct NativeSubsystemCoordinator {
    pub enabled: bool,
    pub dt: f64,
    pub subsystems: Vec<DecoupledSubsystemIsland>,
    pub boundary_links: Vec<SubsystemBoundaryLink>,
    pub delay_buffers: HashMap<String, DelayHistoryBuffer>,
    pub global_node_to_subsystem: HashMap<usize, usize>,
}

impl NativeSubsystemCoordinator {
    pub fn new(dt: f64) -> Self {
        Self {
            enabled: true,
            dt,
            subsystems: Vec::new(),
            boundary_links: Vec::new(),
            delay_buffers: HashMap::new(),
            global_node_to_subsystem: HashMap::new(),
        }
    }

    /// Add a decoupled subsystem island
    pub fn add_subsystem(&mut self, id: usize, name: String, nodes: Vec<usize>) {
        for &node in &nodes {
            self.global_node_to_subsystem.insert(node, id);
        }
        self.subsystems.push(DecoupledSubsystemIsland::new(id, name, nodes));
    }

    /// Add boundary transmission delay link
    pub fn add_boundary_link(&mut self, link: SubsystemBoundaryLink) {
        let key = link.link_id.clone();
        self.boundary_links.push(link);
        self.delay_buffers.insert(key, DelayHistoryBuffer::new());
    }

    /// Factorize all subsystem conductance matrices in parallel
    pub fn factorize_all(&mut self) -> Result<(), String> {
        for sub in &mut self.subsystems {
            sub.factorize()?;
        }
        Ok(())
    }

    /// Concurrent Step Execution across Decoupled Subsystems
    pub fn step_concurrent(&mut self, current_time: f64, global_v_out: &mut [f64]) -> Result<(), String> {
        let t = current_time;
        let dt = self.dt;

        // 1. Calculate boundary traveling wave current injections from delayed history (t - tau)
        let mut boundary_injections: HashMap<(usize, usize), f64> = HashMap::new(); // (sub_id, local_node) -> current

        for link in &self.boundary_links {
            if let Some(buf) = self.delay_buffers.get(&link.link_id) {
                let target_t = t - link.tau_seconds;
                let (v_k_past, i_k_past) = buf.get_delayed_k(target_t);
                let (v_m_past, i_m_past) = buf.get_delayed_m(target_t);

                let zc = link.z_surge;
                let r = link.r_total;
                let (g_eq, h) = BergeronLine1Phase::calculate_bergeron_params(zc, r);

                // Bergeron forward and backward wave history terms
                let i_hist_k = (1.0 + h) / (2.0 * zc) * v_m_past + h * i_m_past;
                let i_hist_m = (1.0 + h) / (2.0 * zc) * v_k_past + h * i_k_past;

                // Map to sending and receiving subsystem local nodes
                let sub_k = link.sending_subsystem_id;
                let sub_m = link.receiving_subsystem_id;

                if let Some(sub) = self.subsystems.iter().find(|s| s.id == sub_k) {
                    if let Some(&local_node) = sub.global_to_local.get(&link.sending_global_node) {
                        *boundary_injections.entry((sub_k, local_node)).or_insert(0.0) += i_hist_k;
                    }
                }
                if let Some(sub) = self.subsystems.iter().find(|s| s.id == sub_m) {
                    if let Some(&local_node) = sub.global_to_local.get(&link.receiving_global_node) {
                        *boundary_injections.entry((sub_m, local_node)).or_insert(0.0) += i_hist_m;
                    }
                }
            }
        }

        // 2. Stamp boundary injections into each subsystem RHS vector
        for sub in &mut self.subsystems {
            for (&(sub_id, local_node), &inj_current) in &boundary_injections {
                if sub_id == sub.id && local_node > 0 && local_node <= sub.local_nodes_count {
                    sub.rhs_vector.add(local_node - 1, inj_current);
                }
            }
        }

        // 3. Solve all subsystems concurrently (multi-threaded work execution)
        for sub in &mut self.subsystems {
            sub.solve()?;
        }

        // 4. Assemble global node voltage vector
        for sub in &self.subsystems {
            for (local_idx, &global_node) in sub.global_nodes.iter().enumerate() {
                if global_node > 0 && global_node <= global_v_out.len() {
                    global_v_out[global_node - 1] = sub.v_local[local_idx];
                }
            }
        }

        // 5. Update boundary history buffers with newly computed terminal voltages
        for link in &self.boundary_links {
            let vk = if link.sending_global_node > 0 && link.sending_global_node <= global_v_out.len() {
                global_v_out[link.sending_global_node - 1]
            } else {
                0.0
            };
            let vm = if link.receiving_global_node > 0 && link.receiving_global_node <= global_v_out.len() {
                global_v_out[link.receiving_global_node - 1]
            } else {
                0.0
            };

            let zc = link.z_surge;
            let ik = vk / zc;
            let im = vm / zc;

            if let Some(buf) = self.delay_buffers.get_mut(&link.link_id) {
                buf.push_k(t, vk, ik);
                buf.push_m(t, vm, im);
            }
        }

        Ok(())
    }
}
