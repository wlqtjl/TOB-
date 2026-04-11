//! Integration test suite — OPDL load & world integrity (§6.2).
//! Run: cargo test --workspace
use omni_sim_core::SimulationCore;

const SMARTX_OPDL: &str = include_str!("../../vendor/smartx/smartx.opdl.json");

// ── Happy-path tests ───────────────────────────────────────────────────────

#[test]
fn test_load_smartx_pack() {
    let core = SimulationCore::from_opdl(SMARTX_OPDL).expect("SmartX pack must load");
    assert_eq!(core.entity_count(), 5, "SmartX pack has 5 entities");
}

#[test]
fn test_tick_runs_without_panic() {
    let mut core = SimulationCore::from_opdl(SMARTX_OPDL).unwrap();
    for _ in 0..60 { core.update(0.016); }
    assert_eq!(core.tick(), 60);
}

#[test]
fn test_entity_count_stable_over_ticks() {
    let mut core = SimulationCore::from_opdl(SMARTX_OPDL).unwrap();
    let before = core.entity_count();
    for _ in 0..1000 { core.update(0.016); }
    assert_eq!(core.entity_count(), before, "no entities should appear or disappear");
}

// ── Rejection tests (§6.2) ────────────────────────────────────────────────

#[test]
fn test_reject_invalid_cpu() {
    let bad = r#"{"version":"1.0","pack_id":"bad",
        "entities":[{"id":"x","entity_type":"Server",
        "components":{"cpu":1.5,"memory":0.5}}]}"#;
    assert!(SimulationCore::from_opdl(bad).is_err(), "cpu=1.5 must fail validation");
}

#[test]
fn test_reject_duplicate_id() {
    let bad = r#"{"version":"1.0","pack_id":"dup",
        "entities":[
            {"id":"same","entity_type":"Server","components":{"cpu":0.1,"memory":0.1}},
            {"id":"same","entity_type":"Server","components":{"cpu":0.2,"memory":0.2}}
        ]}"#;
    assert!(SimulationCore::from_opdl(bad).is_err(), "duplicate id must fail");
}

#[test]
fn test_reject_unknown_entity_type() {
    let bad = r#"{"version":"1.0","pack_id":"t",
        "entities":[{"id":"x","entity_type":"Robot","components":{"cpu":0.1,"memory":0.1}}]}"#;
    assert!(SimulationCore::from_opdl(bad).is_err(), "unknown entity_type must fail");
}

#[test]
fn test_reject_wrong_version() {
    let bad = r#"{"version":"99.0","pack_id":"t",
        "entities":[{"id":"x","entity_type":"Server","components":{"cpu":0.1,"memory":0.1}}]}"#;
    assert!(SimulationCore::from_opdl(bad).is_err(), "version 99.0 must fail");
}

#[test]
fn test_reject_empty_entities() {
    let bad = r#"{"version":"1.0","pack_id":"empty","entities":[]}"#;
    assert!(SimulationCore::from_opdl(bad).is_err(), "empty entity list must fail");
}

// ── Minimal valid doc ─────────────────────────────────────────────────────

#[test]
fn test_minimal_valid_doc() {
    let minimal = r#"{"version":"1.0","pack_id":"min",
        "entities":[{"id":"n1","entity_type":"Server","components":{"cpu":0.0,"memory":0.0}}]}"#;
    let core = SimulationCore::from_opdl(minimal).expect("minimal doc must load");
    assert_eq!(core.entity_count(), 1);
}

#[test]
fn test_all_entity_types_accepted() {
    for et in &["Server", "Switch", "Storage", "VM"] {
        let json = format!(r#"{{"version":"1.0","pack_id":"t",
            "entities":[{{"id":"x","entity_type":"{et}",
            "components":{{"cpu":0.1,"memory":0.1}}}}]}}"#);
        assert!(SimulationCore::from_opdl(&json).is_ok(), "{et} must be accepted");
    }
}
