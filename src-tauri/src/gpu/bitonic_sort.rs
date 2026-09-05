use serde::{Deserialize, Serialize};

/// MMC Submodule State
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmoduleVoltageState {
    pub sm_id: usize,
    pub v_cap: f64,
    pub is_inserted: bool,
}

/// Bitonic Sorter for Multi-Module MMC Capacitor Balancing
pub struct NativeBitonicSorter;

impl NativeBitonicSorter {
    /// In-place bitonic sort for MMC submodule voltages
    pub fn sort_submodules(submodules: &mut [SubmoduleVoltageState], ascending: bool) {
        let n = submodules.len();
        if n <= 1 {
            return;
        }

        let padded_n = n.next_power_of_two();
        let mut padded = Vec::with_capacity(padded_n);
        for sm in submodules.iter() {
            padded.push(sm.clone());
        }
        while padded.len() < padded_n {
            padded.push(SubmoduleVoltageState {
                sm_id: usize::MAX,
                v_cap: if ascending { f64::INFINITY } else { f64::NEG_INFINITY },
                is_inserted: false,
            });
        }

        let mut k = 2;
        while k <= padded_n {
            let mut j = k >> 1;
            while j > 0 {
                for i in 0..padded_n {
                    let l = i ^ j;
                    if l > i {
                        let block_asc = ((i & k) == 0) == ascending;
                        let should_swap = if block_asc {
                            padded[i].v_cap > padded[l].v_cap
                        } else {
                            padded[i].v_cap < padded[l].v_cap
                        };
                        if should_swap {
                            padded.swap(i, l);
                        }
                    }
                }
                j >>= 1;
            }
            k <<= 1;
        }

        // Copy back valid elements
        let mut valid_idx = 0;
        for sm in padded {
            if sm.sm_id != usize::MAX && valid_idx < submodules.len() {
                submodules[valid_idx] = sm;
                valid_idx += 1;
            }
        }
    }

    /// Balance MMC arm capacitor voltages
    pub fn balance_arm(submodules: &mut [SubmoduleVoltageState], n_on: usize, i_arm: f64) {
        let charging = i_arm >= 0.0;
        // If charging, sort ascending (lowest Vc first); if discharging, descending (highest Vc first)
        Self::sort_submodules(submodules, charging);

        for (idx, sm) in submodules.iter_mut().enumerate() {
            sm.is_inserted = idx < n_on;
        }

        // Restore original ID ordering
        submodules.sort_by_key(|sm| sm.sm_id);
    }
}
