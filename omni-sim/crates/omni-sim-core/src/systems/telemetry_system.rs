// Component types are re-exported from lib.rs → omni_sim_opdl
use crate::{Behavior, Cpu, Memory};

/// Advance CPU usage by `delta` seconds using each entity's `Behavior.cpu_growth_rate`.
/// hecs Archetype storage keeps same-component entities contiguous — this loop
/// is sequential memory and SIMD-vectorisable by rustc.
pub fn run_telemetry(world: &mut hecs::World, delta: f32) {
    for (_, (cpu, beh)) in world.query_mut::<(&mut Cpu, &Behavior)>() {
        cpu.usage = (cpu.usage + beh.cpu_growth_rate * delta).clamp(0.0, 1.0);
    }
}

/// Clamp memory usage and apply any future pressure model.
pub fn run_memory_system(world: &mut hecs::World, _delta: f32) {
    for (_, mem) in world.query_mut::<&mut Memory>() {
        mem.used_ratio = mem.used_ratio.clamp(0.0, 1.0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use omni_sim_opdl::{BehavC, CpuC, MemC};

    fn world_with_entity(cpu: f32, rate: f32) -> hecs::World {
        let mut w = hecs::World::new();
        w.spawn((
            CpuC {
                usage: cpu,
                cores: 8,
            },
            MemC {
                used_ratio: 0.3,
                total_gb: 64.0,
            },
            BehavC {
                cpu_growth_rate: rate,
                burst_threshold: 0.9,
            },
        ));
        w
    }

    #[test]
    fn advances_cpu() {
        let mut w = world_with_entity(0.5, 0.1);
        run_telemetry(&mut w, 1.0);
        let cpu = w.query_mut::<&Cpu>().into_iter().next().unwrap().1.usage;
        assert!((cpu - 0.6).abs() < 1e-5, "got {cpu}");
    }

    #[test]
    fn clamps_at_one() {
        let mut w = world_with_entity(0.99, 0.5);
        run_telemetry(&mut w, 1.0);
        let cpu = w.query_mut::<&Cpu>().into_iter().next().unwrap().1.usage;
        assert_eq!(cpu, 1.0);
    }

    #[test]
    fn negative_rate_decreases_cpu() {
        let mut w = world_with_entity(0.5, -0.1);
        run_telemetry(&mut w, 1.0);
        let cpu = w.query_mut::<&Cpu>().into_iter().next().unwrap().1.usage;
        assert!((cpu - 0.4).abs() < 1e-5, "got {cpu}");
    }
}
