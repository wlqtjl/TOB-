//! Adaptive telemetry sampler.
//!
//! Sampling policy (§5.1):
//! - Default interval: 100 ms
//! - Under critical load: drops to 50 ms (more data when it matters)
//! - Idle (all entities normal): relaxes to 500 ms (saves bandwidth)
//!
//! The sampler is intentionally stateless per-call: the caller manages
//! the ring buffer and decides when to forward frames to the WebSocket.

use crate::buffer::{AlertStatus, EntitySample, TelemetryFrame};
use omni_sim_core::SimulationCore;
use omni_sim_core::{Cpu as CpuC, Memory as MemC, NetworkPort as NetC};

/// Recommended sample interval given the current world state.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SampleInterval {
    /// All entities normal — relax sampling.
    Idle,
    /// Mix of normal/warning — default rate.
    Normal,
    /// Any entity critical — high frequency.
    Critical,
}

impl SampleInterval {
    pub fn millis(self) -> u64 {
        match self {
            Self::Idle => 500,
            Self::Normal => 100,
            Self::Critical => 50,
        }
    }
}

/// Sample the current world state into a `TelemetryFrame`.
///
/// `timestamp_ms` is provided by the caller so this function is pure and
/// testable without real-time clocks.
pub fn sample(core: &SimulationCore, timestamp_ms: u64) -> TelemetryFrame {
    let world = core.world();
    let hash = core.state_hash();
    let state_hash_hex = hash.iter().map(|b| format!("{b:02x}")).collect();

    let mut entities = Vec::new();
    // Iterate all entities that have Cpu + Memory + NetworkPort components.
    for (index, (_, (cpu, mem, net))) in world.query::<(&CpuC, &MemC, &NetC)>().iter().enumerate() {
        let status = AlertStatus::classify(cpu.usage, mem.used_ratio);
        entities.push(EntitySample {
            index,
            cpu: cpu.usage,
            memory: mem.used_ratio,
            network_tx: net.tx_mbps,
            network_rx: net.rx_mbps,
            status,
        });
    }

    TelemetryFrame {
        tick: core.tick(),
        timestamp_ms,
        state_hash_hex,
        entities,
    }
}

/// Recommend the next sample interval based on the last sampled frame.
pub fn recommend_interval(frame: &TelemetryFrame) -> SampleInterval {
    let has_critical = frame
        .entities
        .iter()
        .any(|e| e.status == AlertStatus::Critical);
    let has_warning = frame
        .entities
        .iter()
        .any(|e| e.status == AlertStatus::Warning);

    if has_critical {
        SampleInterval::Critical
    } else if has_warning {
        SampleInterval::Normal
    } else {
        SampleInterval::Idle
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_core(cpu: f32) -> SimulationCore {
        let json = format!(
            r#"{{
            "version":"1.0","pack_id":"t",
            "entities":[{{"id":"n1","entity_type":"Server",
            "components":{{"cpu":{cpu},"memory":0.3}}}}]
        }}"#
        );
        SimulationCore::from_opdl(&json).unwrap()
    }

    #[test]
    fn sample_has_correct_tick() {
        let mut core = make_core(0.2);
        core.update(0.016);
        let frame = sample(&core, 1000);
        assert_eq!(frame.tick, 1);
        assert_eq!(frame.entities.len(), 1);
    }

    #[test]
    fn recommend_idle_for_low_usage() {
        let core = make_core(0.2);
        let frame = sample(&core, 0);
        assert_eq!(recommend_interval(&frame), SampleInterval::Idle);
    }

    #[test]
    fn recommend_critical_for_high_cpu() {
        let core = make_core(0.95);
        let frame = sample(&core, 0);
        assert_eq!(recommend_interval(&frame), SampleInterval::Critical);
    }

    #[test]
    fn recommend_normal_for_warning_cpu() {
        // CPU > 0.7 but <= 0.9 should yield Warning → Normal interval
        let core = make_core(0.75);
        let frame = sample(&core, 0);
        assert_eq!(recommend_interval(&frame), SampleInterval::Normal);
    }

    #[test]
    fn sample_interval_millis_idle() {
        assert_eq!(SampleInterval::Idle.millis(), 500);
    }

    #[test]
    fn sample_interval_millis_normal() {
        assert_eq!(SampleInterval::Normal.millis(), 100);
    }

    #[test]
    fn sample_interval_millis_critical() {
        assert_eq!(SampleInterval::Critical.millis(), 50);
    }

    #[test]
    fn sample_entity_values() {
        let core = make_core(0.2);
        let frame = sample(&core, 5000);
        assert_eq!(frame.timestamp_ms, 5000);
        assert_eq!(frame.entities.len(), 1);
        assert!((frame.entities[0].cpu - 0.2).abs() < 1e-5);
        assert!((frame.entities[0].memory - 0.3).abs() < 1e-5);
        assert_eq!(frame.entities[0].status, crate::buffer::AlertStatus::Normal);
    }

    #[test]
    fn sample_state_hash_hex_is_64_chars() {
        let core = make_core(0.2);
        let frame = sample(&core, 0);
        // Blake3 hash hex = 32 bytes * 2 = 64 hex chars
        assert_eq!(frame.state_hash_hex.len(), 64);
        assert!(frame.state_hash_hex.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn recommend_idle_for_empty_entities() {
        let frame = TelemetryFrame {
            tick: 0,
            timestamp_ms: 0,
            state_hash_hex: "0".repeat(64),
            entities: vec![],
        };
        assert_eq!(recommend_interval(&frame), SampleInterval::Idle);
    }
}
