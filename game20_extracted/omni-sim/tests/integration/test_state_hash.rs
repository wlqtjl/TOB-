//! State hash integration tests (§6.2 — determinism & integrity).
use omni_sim_core::SimulationCore;

const PACK: &str = r#"{"version":"1.0","pack_id":"hash-test",
    "entities":[
        {"id":"s1","entity_type":"Server","components":{"cpu":0.2,"memory":0.3}},
        {"id":"s2","entity_type":"Server","components":{"cpu":0.5,"memory":0.6}}
    ]}"#;

#[test]
fn hash_is_32_bytes() {
    let core = SimulationCore::from_opdl(PACK).unwrap();
    assert_eq!(core.state_hash().len(), 32);
}

#[test]
fn hash_deterministic_100_frames() {
    let mut c1 = SimulationCore::from_opdl(PACK).unwrap();
    let mut c2 = SimulationCore::from_opdl(PACK).unwrap();
    for _ in 0..100 { c1.update(0.016); c2.update(0.016); }
    assert_eq!(c1.state_hash(), c2.state_hash(),
        "two identically-driven cores must produce identical hashes");
}

#[test]
fn hash_changes_every_frame() {
    let mut core = SimulationCore::from_opdl(PACK).unwrap();
    let mut prev = core.state_hash();
    for i in 1..=20 {
        core.update(0.016);
        let curr = core.state_hash();
        assert_ne!(prev, curr, "frame {i}: hash must change each tick");
        prev = curr;
    }
}

#[test]
fn different_initial_states_produce_different_hashes() {
    let pack_a = r#"{"version":"1.0","pack_id":"a",
        "entities":[{"id":"s1","entity_type":"Server","components":{"cpu":0.1,"memory":0.2}}]}"#;
    let pack_b = r#"{"version":"1.0","pack_id":"b",
        "entities":[{"id":"s1","entity_type":"Server","components":{"cpu":0.9,"memory":0.8}}]}"#;

    let mut ca = SimulationCore::from_opdl(pack_a).unwrap();
    let mut cb = SimulationCore::from_opdl(pack_b).unwrap();
    ca.update(0.016); cb.update(0.016);
    assert_ne!(ca.state_hash(), cb.state_hash(),
        "different initial CPU/memory must yield different hashes");
}

#[test]
fn diverged_simulations_produce_different_hashes() {
    // Both start identical; c2 gets an extra half-second tick.
    let mut c1 = SimulationCore::from_opdl(PACK).unwrap();
    let mut c2 = SimulationCore::from_opdl(PACK).unwrap();
    for _ in 0..50 { c1.update(0.016); c2.update(0.016); }
    c2.update(0.5); // diverge
    assert_ne!(c1.state_hash(), c2.state_hash(), "diverged simulations must differ");
}
