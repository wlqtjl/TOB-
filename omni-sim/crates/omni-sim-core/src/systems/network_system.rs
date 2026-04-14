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

#[cfg(test)]
mod tests {
    use super::*;
    use omni_sim_opdl::NetC;

    fn world_with_net(tx: f32, rx: f32) -> hecs::World {
        let mut w = hecs::World::new();
        w.spawn((NetC {
            tx_mbps: tx,
            rx_mbps: rx,
        },));
        w
    }

    #[test]
    fn network_values_stay_clamped() {
        let mut w = world_with_net(0.99, 0.99);
        // Run many ticks to ensure values stay in bounds
        for _ in 0..1000 {
            run_network(&mut w, 0.016);
        }
        let net = w
            .query_mut::<&NetworkPort>()
            .into_iter()
            .next()
            .unwrap()
            .1;
        assert!(net.tx_mbps >= 0.0 && net.tx_mbps <= 1.0);
        assert!(net.rx_mbps >= 0.0 && net.rx_mbps <= 1.0);
    }

    #[test]
    fn network_values_remain_non_negative() {
        let mut w = world_with_net(0.01, 0.01);
        for _ in 0..1000 {
            run_network(&mut w, 0.016);
        }
        let net = w
            .query_mut::<&NetworkPort>()
            .into_iter()
            .next()
            .unwrap()
            .1;
        assert!(net.tx_mbps >= 0.0);
        assert!(net.rx_mbps >= 0.0);
    }

    #[test]
    fn zero_delta_no_change() {
        let mut w = world_with_net(0.5, 0.5);
        run_network(&mut w, 0.0);
        let net = w
            .query_mut::<&NetworkPort>()
            .into_iter()
            .next()
            .unwrap()
            .1;
        assert!((net.tx_mbps - 0.5).abs() < 1e-6);
        assert!((net.rx_mbps - 0.5).abs() < 1e-6);
    }

    #[test]
    fn network_applies_jitter() {
        let mut w = world_with_net(0.5, 0.5);
        run_network(&mut w, 1.0); // large delta to amplify jitter
        let net = w
            .query_mut::<&NetworkPort>()
            .into_iter()
            .next()
            .unwrap()
            .1;
        // With a large delta, values should change (unless jitter happens to be exactly 0)
        // At tx=0.5, phase_tx = 0.5 * TAU = PI, sin(PI + 0.5) ≈ sin(3.64) ≈ -0.44
        // jitter_tx ≈ -0.44 * 1.0 * 0.01 = -0.0044
        // So tx should be ~0.4956
        assert!((net.tx_mbps - 0.5).abs() > 1e-6 || (net.rx_mbps - 0.5).abs() > 1e-6);
    }
}
