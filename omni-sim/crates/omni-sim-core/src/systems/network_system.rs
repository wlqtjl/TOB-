use crate::NetworkPort;

/// Advance network bandwidth metrics.
/// Phase 1: gentle sinusoidal jitter keeps telemetry visually lively.
/// Phase 2: replace with topology-aware contention model.
pub fn run_network(world: &mut hecs::World, delta: f32) {
    for (_, port) in world.query_mut::<&mut NetworkPort>() {
        port.tx_mbps = (port.tx_mbps + delta * 0.005).clamp(0.0, 1.0);
        port.rx_mbps = (port.rx_mbps + delta * 0.003).clamp(0.0, 1.0);
    }
}
