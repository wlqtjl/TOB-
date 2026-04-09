/// Canonical ECS component types for Omni-Sim.
///
/// Defined here (in omni-sim-opdl) so the OPDL compiler can spawn entities
/// with the exact types that omni-sim-core queries — zero type-mismatch risk.
/// omni-sim-core re-exports these with ergonomic aliases (Cpu, Memory, …).

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct CpuC {
    pub usage: f32,
    pub cores: u8,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct MemC {
    pub used_ratio: f32,
    pub total_gb: f32,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct NetC {
    pub tx_mbps: f32,
    pub rx_mbps: f32,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct MetaC {
    pub vendor_id: u16,
    pub entity_type: EntityType,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EntityType {
    Server,
    Switch,
    Storage,
    Vm,
}

#[derive(Clone, Copy, Debug)]
pub struct BehavC {
    pub cpu_growth_rate: f32,
    pub burst_threshold: f32,
}

impl Default for BehavC {
    fn default() -> Self {
        Self {
            cpu_growth_rate: 0.01,
            burst_threshold: 0.9,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn behavc_default_values() {
        let b = BehavC::default();
        assert!((b.cpu_growth_rate - 0.01).abs() < 1e-6);
        assert!((b.burst_threshold - 0.9).abs() < 1e-6);
    }

    #[test]
    fn entity_type_equality() {
        assert_eq!(EntityType::Server, EntityType::Server);
        assert_ne!(EntityType::Server, EntityType::Switch);
        assert_ne!(EntityType::Storage, EntityType::Vm);
    }

    #[test]
    fn cpuc_clone_and_eq() {
        let cpu = CpuC {
            usage: 0.5,
            cores: 8,
        };
        let clone = cpu;
        assert_eq!(cpu, clone);
    }

    #[test]
    fn memc_clone_and_eq() {
        let mem = MemC {
            used_ratio: 0.7,
            total_gb: 64.0,
        };
        let clone = mem;
        assert_eq!(mem, clone);
    }

    #[test]
    fn netc_clone_and_eq() {
        let net = NetC {
            tx_mbps: 0.5,
            rx_mbps: 0.3,
        };
        let clone = net;
        assert_eq!(net, clone);
    }

    #[test]
    fn metac_fields() {
        let meta = MetaC {
            vendor_id: 42,
            entity_type: EntityType::Storage,
        };
        assert_eq!(meta.vendor_id, 42);
        assert_eq!(meta.entity_type, EntityType::Storage);
    }
}
