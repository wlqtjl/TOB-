use crate::NetworkPort;

/// Advance network bandwidth metrics.
/// H-02 FIX: actual sinusoidal jitter instead of linear-only accumulation.
/// Uses `sin()` modulated by accumulated time to produce oscillating values
/// that don't monotonically saturate to 1.0.
///
/// Phase 2: replace with topology-aware contention model.
pub fn run_network(world: &mut hecs::World, delta: f32) {
    for (_, port) in world.query_mut::<&mut NetworkPort>() {
        // Use current value as a cheap phase accumulator.
        let phase_tx = port.tx_mbps * std::f32::consts::TAU;
        let phase_rx = port.rx_mbps * std::f32::consts::TAU;

        let jitter_tx = (phase_tx + delta * 0.5).sin() * delta * 0.01;
        let jitter_rx = (phase_rx + delta * 0.3).sin() * delta * 0.008;

        port.tx_mbps = (port.tx_mbps + jitter_tx).clamp(0.0, 1.0);
        port.rx_mbps = (port.rx_mbps + jitter_rx).clamp(0.0, 1.0);
    }
}
