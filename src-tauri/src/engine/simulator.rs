use super::cda::CdaManager;
use super::companion::{CompanionBranch, DynamicVoltageSource};
use super::interpolator::SubStepInterpolator;
use super::lines::{BergeronLine1Phase, PolyphaseBergeronLine};
use super::machines::{DfigMachine, PmsgMachine, SynchronousMachineDq};
use super::netlist::{CircuitNetlist, ConductanceMatrix, RhsVector};
use super::power_electronics::{IgbtSwitch, Lcc6PulseBridge, MmcArmDem, PowerDiode, StatcomModel, SvcModel, Thyristor};
use super::sparse_solver::SparseLuSolver;
use super::transformers::UmecTransformer;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Native Rust EMTDC Simulation Kernel Coordinator
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationConfig {
    pub dt: f64,
    pub t_max: f64,
    pub cda_enabled: bool,
    pub interpolation_enabled: bool,
}

impl Default for SimulationConfig {
    fn default() -> Self {
        Self {
            dt: 5e-5,
            t_max: 0.5,
            cda_enabled: true,
            interpolation_enabled: true,
        }
    }
}

pub struct NativeEmtSimulator {
    pub config: SimulationConfig,
    pub current_time: f64,
    pub step_count: u64,
    pub num_nodes: usize,

    // Matrix and solver
    pub g_matrix: ConductanceMatrix,
    pub rhs_vector: RhsVector,
    pub node_voltages: Vec<f64>,
    pub solver: SparseLuSolver,

    // Subsystems & Components
    pub cda: CdaManager,
    pub interpolator: SubStepInterpolator,
    pub companion_branches: Vec<CompanionBranch>,
    pub voltage_sources: Vec<DynamicVoltageSource>,
    pub bergeron_lines: Vec<BergeronLine1Phase>,
    pub polyphase_lines: Vec<PolyphaseBergeronLine>,
    pub diodes: Vec<PowerDiode>,
    pub thyristors: Vec<Thyristor>,
    pub igbts: Vec<IgbtSwitch>,
    pub mmc_arms: Vec<MmcArmDem>,
    pub lcc_bridges: Vec<Lcc6PulseBridge>,
    pub statcoms: Vec<StatcomModel>,
    pub svcs: Vec<SvcModel>,
    pub sync_machines: Vec<SynchronousMachineDq>,
    pub dfigs: Vec<DfigMachine>,
    pub pmsgs: Vec<PmsgMachine>,
    pub transformers: Vec<UmecTransformer>,

    // Signals cache for oscilloscope / streaming
    pub signals: HashMap<String, Vec<f64>>,
}

impl NativeEmtSimulator {
    pub fn new(config: SimulationConfig, num_nodes: usize) -> Self {
        let n = num_nodes;
        Self {
            config: config.clone(),
            current_time: 0.0,
            step_count: 0,
            num_nodes: n,
            g_matrix: ConductanceMatrix::new(n),
            rhs_vector: RhsVector::new(n),
            node_voltages: vec![0.0; n],
            solver: SparseLuSolver::new(n),
            cda: CdaManager::new(config.cda_enabled),
            interpolator: SubStepInterpolator::new(config.interpolation_enabled),
            companion_branches: Vec::new(),
            voltage_sources: Vec::new(),
            bergeron_lines: Vec::new(),
            polyphase_lines: Vec::new(),
            diodes: Vec::new(),
            thyristors: Vec::new(),
            igbts: Vec::new(),
            mmc_arms: Vec::new(),
            lcc_bridges: Vec::new(),
            statcoms: Vec::new(),
            svcs: Vec::new(),
            sync_machines: Vec::new(),
            dfigs: Vec::new(),
            pmsgs: Vec::new(),
            transformers: Vec::new(),
            signals: HashMap::new(),
        }
    }

    /// Assemble and factorize nodal admittance matrix [G]
    pub fn assemble_and_factorize_matrix(&mut self) -> Result<(), String> {
        self.g_matrix.clear();

        // 1. Stamp companion passive branches
        for b in &self.companion_branches {
            b.stamp_conductance(&mut self.g_matrix);
        }

        // 2. Stamp voltage sources (Norton internal conductances)
        for vs in &self.voltage_sources {
            vs.stamp_conductance(&mut self.g_matrix);
        }

        // 3. Stamp distributed transmission lines
        for bl in &self.bergeron_lines {
            bl.stamp_conductance(&mut self.g_matrix);
        }
        for pl in &self.polyphase_lines {
            pl.stamp_conductance(&mut self.g_matrix);
        }

        // 4. Stamp power electronics switches
        for d in &self.diodes {
            d.stamp_conductance(&mut self.g_matrix);
        }
        for thy in &self.thyristors {
            thy.stamp_conductance(&mut self.g_matrix);
        }
        for igbt in &self.igbts {
            igbt.stamp_conductance(&mut self.g_matrix);
        }
        for mmc in &self.mmc_arms {
            mmc.stamp_conductance(&mut self.g_matrix);
        }
        for lcc in &self.lcc_bridges {
            lcc.stamp_conductance(&mut self.g_matrix);
        }
        for statcom in &self.statcoms {
            statcom.stamp_conductance(&mut self.g_matrix);
        }
        for svc in &self.svcs {
            svc.stamp_conductance(&mut self.g_matrix);
        }

        // 5. Stamp machines & transformers
        for m in &self.sync_machines {
            m.stamp_conductance(&mut self.g_matrix);
        }
        for dfig in &self.dfigs {
            dfig.stamp_conductance(&mut self.g_matrix);
        }
        for pmsg in &self.pmsgs {
            pmsg.stamp_conductance(&mut self.g_matrix);
        }
        for tx in &self.transformers {
            tx.stamp_conductance(&mut self.g_matrix);
        }

        // Factorize matrix using Sparse LU solver
        self.solver.factorize(&self.g_matrix.data)
    }

    /// Single EMTDC time-step execution
    pub fn step(&mut self) -> Result<f64, String> {
        let dt = self.config.dt;
        let t = self.current_time + dt;

        // 1. Build RHS vector [I]
        self.rhs_vector.clear();

        for b in &self.companion_branches {
            b.stamp_current(&mut self.rhs_vector);
        }
        for vs in &self.voltage_sources {
            vs.stamp_current(t, &mut self.rhs_vector);
        }
        for bl in &self.bergeron_lines {
            bl.stamp_current(&mut self.rhs_vector);
        }
        for pl in &self.polyphase_lines {
            pl.stamp_current(&mut self.rhs_vector);
        }
        for d in &self.diodes {
            d.stamp_current(&mut self.rhs_vector);
        }
        for thy in &self.thyristors {
            thy.stamp_current(&mut self.rhs_vector);
        }
        for igbt in &self.igbts {
            igbt.stamp_current(&mut self.rhs_vector);
        }
        for mmc in &self.mmc_arms {
            mmc.stamp_current(&mut self.rhs_vector);
        }
        for lcc in &self.lcc_bridges {
            lcc.stamp_current(&mut self.rhs_vector);
        }
        for statcom in &self.statcoms {
            statcom.stamp_current(&mut self.rhs_vector);
        }
        for m in &self.sync_machines {
            m.stamp_current(&mut self.rhs_vector);
        }
        for dfig in &self.dfigs {
            dfig.stamp_current(&mut self.rhs_vector);
        }
        for tx in &self.transformers {
            tx.stamp_current(&mut self.rhs_vector);
        }

        // 2. Solve [G] * [V] = [I]
        self.solver.solve(&self.rhs_vector.data, &mut self.node_voltages)?;

        // 3. Update component history states
        for b in &mut self.companion_branches {
            let vk = if b.node_k > 0 { self.node_voltages[b.node_k - 1] } else { 0.0 };
            let vm = if b.node_m > 0 { self.node_voltages[b.node_m - 1] } else { 0.0 };
            b.update_history(vk, vm);
        }

        for bl in &mut self.bergeron_lines {
            let vk = if bl.node_k > 0 { self.node_voltages[bl.node_k - 1] } else { 0.0 };
            let vm = if bl.node_m > 0 { self.node_voltages[bl.node_m - 1] } else { 0.0 };
            bl.update_step(vk, vm);
        }

        // Check if any semiconductor switch changed state
        let mut switch_changed = false;
        for d in &mut self.diodes {
            let vanode = if d.anode > 0 { self.node_voltages[d.anode - 1] } else { 0.0 };
            let vcathode = if d.cathode > 0 { self.node_voltages[d.cathode - 1] } else { 0.0 };
            if d.update_state(vanode, vcathode, dt) {
                switch_changed = true;
            }
        }
        for thy in &mut self.thyristors {
            let vanode = if thy.anode > 0 { self.node_voltages[thy.anode - 1] } else { 0.0 };
            let vcathode = if thy.cathode > 0 { self.node_voltages[thy.cathode - 1] } else { 0.0 };
            if thy.update_state(vanode, vcathode, dt) {
                switch_changed = true;
            }
        }
        for igbt in &mut self.igbts {
            let vc = if igbt.collector > 0 { self.node_voltages[igbt.collector - 1] } else { 0.0 };
            let ve = if igbt.emitter > 0 { self.node_voltages[igbt.emitter - 1] } else { 0.0 };
            if igbt.update_state(vc, ve) {
                switch_changed = true;
            }
        }

        if switch_changed {
            self.cda.trigger_switching_event();
            self.assemble_and_factorize_matrix()?;
        }

        self.current_time = t;
        self.step_count += 1;

        Ok(self.current_time)
    }
}
