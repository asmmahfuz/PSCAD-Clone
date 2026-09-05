use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub type NodeId = usize;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ComponentType {
    Resistor,
    Inductor,
    Capacitor,
    VoltageSource,
    CurrentSource,
    Switch,
    Diode,
    Thyristor,
    Igbt,
    Transformer,
    TransmissionLine,
    SynchronousMachine,
    InductionMachine,
    MmcArm,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawBranch {
    pub id: String,
    pub comp_type: ComponentType,
    pub node_from: String,
    pub node_to: String,
    pub value: f64,
    pub params: HashMap<String, f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompiledBranch {
    pub id: String,
    pub comp_type: ComponentType,
    pub from: NodeId,
    pub to: NodeId,
    pub value: f64,
    pub params: HashMap<String, f64>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CircuitNetlist {
    pub title: String,
    pub branches: Vec<CompiledBranch>,
    pub node_map: HashMap<String, NodeId>,
    pub num_nodes: usize, // Excludes Ground (0)
}

impl CircuitNetlist {
    pub fn new(title: &str) -> Self {
        let mut node_map = HashMap::new();
        node_map.insert("0".to_string(), 0);
        node_map.insert("GND".to_string(), 0);
        node_map.insert("gnd".to_string(), 0);
        node_map.insert("ground".to_string(), 0);

        Self {
            title: title.to_string(),
            branches: Vec::new(),
            node_map,
            num_nodes: 0,
        }
    }

    pub fn get_or_register_node(&mut self, name: &str) -> NodeId {
        let trimmed = name.trim();
        if trimmed == "0" || trimmed.eq_ignore_ascii_case("gnd") || trimmed.eq_ignore_ascii_case("ground") {
            return 0;
        }

        if let Some(&id) = self.node_map.get(trimmed) {
            id
        } else {
            self.num_nodes += 1;
            self.node_map.insert(trimmed.to_string(), self.num_nodes);
            self.num_nodes
        }
    }

    pub fn add_branch(
        &mut self,
        id: &str,
        comp_type: ComponentType,
        node_from: &str,
        node_to: &str,
        value: f64,
        params: HashMap<String, f64>,
    ) {
        let from = self.get_or_register_node(node_from);
        let to = self.get_or_register_node(node_to);

        self.branches.push(CompiledBranch {
            id: id.to_string(),
            comp_type,
            from,
            to,
            value,
            params,
        });
    }
}

/// Nodal Admittance Conductance Matrix (Sparse Coordinate / Dense Buffer)
#[derive(Debug, Clone)]
pub struct ConductanceMatrix {
    pub size: usize,
    pub data: Vec<f64>,
}

impl ConductanceMatrix {
    pub fn new(size: usize) -> Self {
        Self {
            size,
            data: vec![0.0; size * size],
        }
    }

    pub fn clear(&mut self) {
        self.data.fill(0.0);
    }

    #[inline(always)]
    pub fn get(&self, row: usize, col: usize) -> f64 {
        if row == 0 || col == 0 || row > self.size || col > self.size {
            return 0.0;
        }
        self.data[(row - 1) * self.size + (col - 1)]
    }

    #[inline(always)]
    pub fn add(&mut self, row: usize, col: usize, val: f64) {
        if row == 0 || col == 0 || row > self.size || col > self.size {
            return;
        }
        self.data[(row - 1) * self.size + (col - 1)] += val;
    }

    #[inline(always)]
    pub fn set(&mut self, row: usize, col: usize, val: f64) {
        if row == 0 || col == 0 || row > self.size || col > self.size {
            return;
        }
        self.data[(row - 1) * self.size + (col - 1)] = val;
    }

    /// Stamp standard 2-terminal conductance branch between node k and node m
    #[inline(always)]
    pub fn stamp_branch(&mut self, k: NodeId, m: NodeId, g: f64) {
        if k > 0 {
            self.add(k, k, g);
        }
        if m > 0 {
            self.add(m, m, g);
        }
        if k > 0 && m > 0 {
            self.add(k, m, -g);
            self.add(m, k, -g);
        }
    }
}

/// Nodal Current Injections RHS Vector
#[derive(Debug, Clone)]
pub struct RhsVector {
    pub size: usize,
    pub data: Vec<f64>,
}

impl RhsVector {
    pub fn new(size: usize) -> Self {
        Self {
            size,
            data: vec![0.0; size],
        }
    }

    pub fn clear(&mut self) {
        self.data.fill(0.0);
    }

    #[inline(always)]
    pub fn get(&self, node: usize) -> f64 {
        if node == 0 || node > self.size {
            return 0.0;
        }
        self.data[node - 1]
    }

    #[inline(always)]
    pub fn add(&mut self, node: usize, val: f64) {
        if node == 0 || node > self.size {
            return;
        }
        self.data[node - 1] += val;
    }

    /// Stamp current source entering node k and leaving node m: I_inj = I_src
    #[inline(always)]
    pub fn stamp_current_source(&mut self, k: NodeId, m: NodeId, i_eq: f64) {
        if k > 0 {
            self.add(k, -i_eq); // Leaving k (into ground / circuit)
        }
        if m > 0 {
            self.add(m, i_eq);  // Entering m
        }
    }
}
