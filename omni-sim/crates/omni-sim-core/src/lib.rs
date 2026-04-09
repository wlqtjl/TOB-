//! omni-sim-core — ECS simulation engine.
//!
//! Component types are defined in `omni-sim-opdl` to keep the type system
//! unified.  This crate re-exports them with idiomatic short aliases.
//!
//! Dependency chain (acyclic):
//!   omni-sim-opdl → omni-sim-core → omni-sim-ffi

pub mod scheduler;
pub mod systems;

use anyhow::Result;
use blake3::Hasher;

// Canonical component aliases — one import path for all downstream crates.
pub use omni_sim_opdl::{BehavC as Behavior, CpuC as Cpu, MemC as Memory, NetC as NetworkPort};

use crate::scheduler::tick_systems;

/// Top-level simulation facade.  Single public entry point consumed by FFI.
///
/// **Invariant**: once constructed, the world is always valid.
/// `update()` is panic-free in release builds (`panic = "abort"` in workspace).
pub struct SimulationCore {
    world: hecs::World,
    tick:  u64,
}

impl SimulationCore {
    /// Parse → validate → compile → spawn.
    /// Any failure returns `Err`; no panics cross this boundary.
    pub fn from_opdl(json: &str) -> Result<Self> {
        let world = omni_sim_opdl::compile_to_world(json)?;
        Ok(Self { world, tick: 0 })
    }

    /// Advance by `delta` simulated seconds.  Drives systems in canonical order.
    #[inline(always)]
    pub fn update(&mut self, delta: f32) {
        tick_systems(&mut self.world, delta);
        self.tick += 1;
    }

    /// Deterministic 32-byte Blake3 hash of the current world state (§11).
    ///
    /// C-01 FIX: Uses a single joint query `(&Cpu, &Memory)` to guarantee
    /// consistent iteration order.  Entity data is sorted by `hecs::Entity`
    /// id before hashing so the result is independent of archetype layout.
    ///
    /// Input bytes: tick‖∀(cpu.usage‖mem.used_ratio)  (all little-endian, entity-id order).
    /// Same input sequence → same hash on every platform.
    pub fn state_hash(&self) -> [u8; 32] {
        let mut h = Hasher::new();
        h.update(&self.tick.to_le_bytes());

        // Collect (entity_id, cpu, memory) and sort by entity id for determinism.
        let mut entries: Vec<(hecs::Entity, f32, f32)> = self
            .world
            .query::<(&Cpu, &Memory)>()
            .iter()
            .map(|(e, (cpu, mem))| (e, cpu.usage, mem.used_ratio))
            .collect();
        entries.sort_by_key(|(e, _, _)| e.to_bits());

        for (_, cpu_usage, mem_ratio) in &entries {
            h.update(&cpu_usage.to_le_bytes());
            h.update(&mem_ratio.to_le_bytes());
        }
        *h.finalize().as_bytes()
    }

    pub fn entity_count(&self) -> usize { self.world.len() as usize }
    pub fn tick(&self)         -> u64   { self.tick }
    pub fn world(&self)        -> &hecs::World { &self.world }
}

#[cfg(test)]
mod tests {
    use super::*;

    const MINIMAL: &str = r#"{"version":"1.0","pack_id":"u",
        "entities":[{"id":"n1","entity_type":"Server",
                     "components":{"cpu":0.2,"memory":0.3}}]}"#;

    #[test] fn loads_one_entity()  { assert_eq!(SimulationCore::from_opdl(MINIMAL).unwrap().entity_count(), 1); }
    #[test] fn tick_increments()   { let mut c = SimulationCore::from_opdl(MINIMAL).unwrap(); c.update(0.016); assert_eq!(c.tick(), 1); }
    #[test] fn hash_deterministic() {
        let mut c1 = SimulationCore::from_opdl(MINIMAL).unwrap();
        let mut c2 = SimulationCore::from_opdl(MINIMAL).unwrap();
        for _ in 0..100 { c1.update(0.016); c2.update(0.016); }
        assert_eq!(c1.state_hash(), c2.state_hash());
    }
    #[test] fn hash_changes_per_tick() {
        let mut c = SimulationCore::from_opdl(MINIMAL).unwrap();
        let h0 = c.state_hash(); c.update(0.016);
        assert_ne!(h0, c.state_hash());
    }
    #[test] fn invalid_opdl_is_err() {
        assert!(SimulationCore::from_opdl(r#"{"version":"1.0","pack_id":"t","entities":[
            {"id":"x","entity_type":"Server","components":{"cpu":9.9,"memory":0.3}}]}"#).is_err());
    }
}
