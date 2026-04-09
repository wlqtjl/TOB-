use crate::systems::{
    lifecycle_system::run_lifecycle,
    network_system::run_network,
    telemetry_system::{run_memory_system, run_telemetry},
};

/// Defines the fixed system execution order for one simulation tick.
///
/// Order rationale:
/// 1. `lifecycle` — process deferred spawns/despawns before any reads.
/// 2. `telemetry` — update CPU metrics.
/// 3. `memory`    — update memory metrics (H-01 FIX: was missing).
/// 4. `network`   — update bandwidth metrics (may read CPU state in future).
pub fn tick_systems(world: &mut hecs::World, delta: f32) {
    run_lifecycle(world, delta);
    run_telemetry(world, delta);
    run_memory_system(world, delta);
    run_network(world, delta);
}
