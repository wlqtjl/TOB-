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

#[cfg(test)]
mod tests {
    use super::*;
    use omni_sim_opdl::{BehavC, CpuC, MemC, NetC};

    fn world_with_entity() -> hecs::World {
        let mut w = hecs::World::new();
        w.spawn((
            CpuC {
                usage: 0.5,
                cores: 4,
            },
            MemC {
                used_ratio: 0.4,
                total_gb: 32.0,
            },
            NetC {
                tx_mbps: 0.3,
                rx_mbps: 0.2,
            },
            BehavC {
                cpu_growth_rate: 0.1,
                burst_threshold: 0.9,
            },
        ));
        w
    }

    #[test]
    fn tick_systems_runs_without_panic() {
        let mut w = world_with_entity();
        tick_systems(&mut w, 0.016);
    }

    #[test]
    fn tick_systems_updates_cpu() {
        let mut w = world_with_entity();
        tick_systems(&mut w, 1.0);
        let cpu = w
            .query_mut::<&CpuC>()
            .into_iter()
            .next()
            .unwrap()
            .1
            .usage;
        // CPU should have changed from 0.5 with growth rate 0.1 and delta 1.0
        assert!((cpu - 0.6).abs() < 1e-5, "expected ~0.6, got {cpu}");
    }

    #[test]
    fn tick_systems_clamps_memory() {
        let mut w = hecs::World::new();
        w.spawn((
            CpuC {
                usage: 0.5,
                cores: 4,
            },
            MemC {
                used_ratio: 1.5, // out of range, should be clamped
                total_gb: 32.0,
            },
            NetC {
                tx_mbps: 0.3,
                rx_mbps: 0.2,
            },
            BehavC {
                cpu_growth_rate: 0.0,
                burst_threshold: 0.9,
            },
        ));
        tick_systems(&mut w, 0.016);
        let mem = w
            .query_mut::<&MemC>()
            .into_iter()
            .next()
            .unwrap()
            .1
            .used_ratio;
        assert!(mem <= 1.0, "memory should be clamped to 1.0, got {mem}");
    }

    #[test]
    fn tick_systems_multiple_entities() {
        let mut w = hecs::World::new();
        for i in 0..10 {
            w.spawn((
                CpuC {
                    usage: 0.1 * i as f32,
                    cores: 4,
                },
                MemC {
                    used_ratio: 0.1 * i as f32,
                    total_gb: 32.0,
                },
                NetC {
                    tx_mbps: 0.05 * i as f32,
                    rx_mbps: 0.05 * i as f32,
                },
                BehavC {
                    cpu_growth_rate: 0.01,
                    burst_threshold: 0.9,
                },
            ));
        }
        // Should not panic with multiple entities
        for _ in 0..100 {
            tick_systems(&mut w, 0.016);
        }
        assert_eq!(w.len(), 10);
    }
}
