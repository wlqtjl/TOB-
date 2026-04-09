//! omni-sim-opdl — OPDL compiler + canonical ECS component types.
//!
//! Dependency direction (acyclic):
//!   omni-sim-opdl  (this crate — no upstream deps)
//!       ↑
//!   omni-sim-core  (queries the component types defined here)
//!       ↑
//!   omni-sim-ffi   (C ABI bridge)

pub mod compiler;
pub mod components_stub;
pub mod ir;
pub mod schema;
pub mod validator;

// ── Public re-exports ────────────────────────────────────────────────────────
// All component types live in components_stub; re-exported here for ergonomics.
pub use components_stub::{BehavC, CpuC, EntityType, MemC, MetaC, NetC};
pub use ir::{CompiledDocument, EntityIr};

use anyhow::Result;
use hecs::World;

/// Full OPDL pipeline entry point.
///
/// Stages: parse → validate → compile → spawn into hecs World.
/// Any failure aborts the pipeline; the caller never gets a partial world.
pub fn compile_to_world(json: &str) -> Result<World> {
    let doc = compiler::parse(json)?;
    compiler::validate(&doc)?;
    let compiled = compiler::compile(doc)?;
    Ok(spawn_world(compiled))
}

/// Spawn all IR entities into a fresh hecs World.
/// Called only after validation — all values are guaranteed in range.
fn spawn_world(compiled: CompiledDocument) -> World {
    let mut world = World::new();
    for ir in compiled.entities {
        world.spawn((
            CpuC { usage: ir.components.cpu, cores: ir.components.cpu_cores },
            MemC { used_ratio: ir.components.memory, total_gb: ir.components.memory_gb },
            NetC { tx_mbps: ir.components.network_tx, rx_mbps: ir.components.network_rx },
            MetaC { vendor_id: 0, entity_type: ir.entity_type },
            ir.behavior,
        ));
    }
    world
}

#[cfg(test)]
mod tests {
    use super::*;

    const TWO_ENTITIES: &str = r#"{
        "version":"1.0","pack_id":"test",
        "entities":[
            {"id":"s1","entity_type":"Server","components":{"cpu":0.2,"memory":0.3}},
            {"id":"sw1","entity_type":"Switch","components":{"cpu":0.1,"memory":0.1}}
        ]}"#;

    #[test]
    fn compile_to_world_correct_count() {
        assert_eq!(compile_to_world(TWO_ENTITIES).unwrap().len(), 2);
    }

    #[test]
    fn rejects_invalid_cpu() {
        let bad = r#"{"version":"1.0","pack_id":"t","entities":[
            {"id":"x","entity_type":"Server","components":{"cpu":9.9,"memory":0.3}}]}"#;
        assert!(compile_to_world(bad).is_err());
    }

    #[test]
    fn world_has_cpu_components() {
        let world = compile_to_world(TWO_ENTITIES).unwrap();
        let cpus: Vec<_> = world.query::<&CpuC>().iter()
            .map(|(_, c)| c.usage).collect();
        assert_eq!(cpus.len(), 2);
    }
}
