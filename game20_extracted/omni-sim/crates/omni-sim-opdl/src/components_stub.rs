/// Canonical ECS component types for Omni-Sim.
///
/// Defined here (in omni-sim-opdl) so the OPDL compiler can spawn entities
/// with the exact types that omni-sim-core queries — zero type-mismatch risk.
/// omni-sim-core re-exports these with ergonomic aliases (Cpu, Memory, …).

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct CpuC { pub usage: f32, pub cores: u8 }

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct MemC { pub used_ratio: f32, pub total_gb: f32 }

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct NetC { pub tx_mbps: f32, pub rx_mbps: f32 }

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct MetaC { pub vendor_id: u16, pub entity_type: EntityType }

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EntityType { Server, Switch, Storage, Vm }

#[derive(Clone, Copy, Debug)]
pub struct BehavC { pub cpu_growth_rate: f32, pub burst_threshold: f32 }

impl Default for BehavC {
    fn default() -> Self { Self { cpu_growth_rate: 0.01, burst_threshold: 0.9 } }
}
