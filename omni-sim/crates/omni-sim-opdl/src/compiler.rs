//! OPDL three-stage compiler pipeline.
//!
//! Stage 1 — Parse:    JSON string  → OpdlDocument     (serde)
//! Stage 2 — Validate: OpdlDocument → ()               (semantic rules)
//! Stage 3 — Compile:  OpdlDocument → CompiledDocument (type-safe IR)

use crate::components_stub::{BehavC, EntityType};
use crate::ir::{CompiledDocument, ComponentsIr, EntityIr, LinkIr};
use crate::schema::OpdlDocument;
use crate::validator;
use anyhow::{anyhow, Context, Result};

// ── Stage 1: Parse ────────────────────────────────────────────────────────────

pub fn parse(json: &str) -> Result<OpdlDocument> {
    serde_json::from_str(json).context("OPDL JSON parse error")
}

// ── Stage 2: Validate ─────────────────────────────────────────────────────────

/// Collect all semantic errors before returning.
pub fn validate(doc: &OpdlDocument) -> Result<()> {
    validator::validate(doc).map_err(|errors| {
        let msg = errors
            .iter()
            .enumerate()
            .map(|(i, e)| format!("  [{i}] {e}"))
            .collect::<Vec<_>>()
            .join("\n");
        anyhow!(
            "OPDL validation failed ({} error(s)):\n{}",
            errors.len(),
            msg
        )
    })
}

// ── Stage 3: Compile ──────────────────────────────────────────────────────────

/// H-06 FIX: now returns `Result` because `parse_entity_type` is fallible.
/// Validation should have caught unknown types, but defensive error handling
/// is safer than `panic!` under `panic = "abort"`.
pub fn compile(doc: OpdlDocument) -> Result<CompiledDocument> {
    let entities = doc
        .entities
        .into_iter()
        .map(|e| -> Result<EntityIr> {
            Ok(EntityIr {
                id: e.id,
                entity_type: parse_entity_type(&e.entity_type)?,
                components: ComponentsIr {
                    cpu: e.components.cpu,
                    memory: e.components.memory,
                    cpu_cores: e.components.cpu_cores,
                    memory_gb: e.components.memory_gb,
                    network_tx: e.components.network_tx,
                    network_rx: e.components.network_rx,
                },
                behavior: BehavC {
                    cpu_growth_rate: e.behaviors.cpu_growth_rate,
                    burst_threshold: e.behaviors.burst_threshold,
                },
            })
        })
        .collect::<Result<Vec<_>>>()?;

    let links = doc
        .topology
        .map(|t| {
            t.links
                .into_iter()
                .map(|l| LinkIr {
                    from: l.from,
                    to: l.to,
                    bandwidth_gbps: l.bandwidth_gbps,
                })
                .collect()
        })
        .unwrap_or_default();

    Ok(CompiledDocument {
        pack_id: doc.pack_id,
        entities,
        links,
    })
}

/// H-06 FIX: returns `Result` instead of panicking.  Even though the
/// validator should prevent unknown types, a defensive `Err` is safer
/// than `panic!` in a `panic = "abort"` profile.
fn parse_entity_type(s: &str) -> Result<EntityType> {
    match s {
        "Server" => Ok(EntityType::Server),
        "Switch" => Ok(EntityType::Switch),
        "Storage" => Ok(EntityType::Storage),
        "VM" => Ok(EntityType::Vm),
        other => Err(anyhow!("unknown entity_type '{other}'")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const VALID: &str = r#"{"version":"1.0","pack_id":"p",
        "entities":[
            {"id":"s1","entity_type":"Server","components":{"cpu":0.2,"memory":0.4,"cpu_cores":8}},
            {"id":"sw1","entity_type":"Switch","components":{"cpu":0.1,"memory":0.1}}
        ]}"#;

    #[test]
    fn pipeline_roundtrip() {
        let doc = parse(VALID).unwrap();
        validate(&doc).unwrap();
        let c = compile(doc).unwrap();
        assert_eq!(c.entities.len(), 2);
        assert_eq!(c.entities[0].entity_type, EntityType::Server);
        assert_eq!(c.entities[1].entity_type, EntityType::Switch);
    }

    #[test]
    fn bad_json_fails_parse() {
        assert!(parse("{bad}").is_err());
    }
    #[test]
    fn bad_cpu_fails_validate() {
        let doc = parse(
            r#"{"version":"1.0","pack_id":"t","entities":[
            {"id":"x","entity_type":"Server","components":{"cpu":2.0,"memory":0.3}}]}"#,
        )
        .unwrap();
        assert!(validate(&doc).is_err());
    }

    #[test]
    fn defaults_applied() {
        let doc = parse(
            r#"{"version":"1.0","pack_id":"t","entities":[
            {"id":"x","entity_type":"Server","components":{"cpu":0.1,"memory":0.2}}]}"#,
        )
        .unwrap();
        let c = compile(doc).unwrap();
        assert_eq!(c.entities[0].components.cpu_cores, 1); // default_cores()
        assert!((c.entities[0].behavior.cpu_growth_rate - 0.01).abs() < 1e-6);
    }

    #[test]
    fn all_entity_types_compile() {
        let json = r#"{"version":"1.0","pack_id":"t","entities":[
            {"id":"s","entity_type":"Server","components":{"cpu":0.1,"memory":0.1}},
            {"id":"sw","entity_type":"Switch","components":{"cpu":0.1,"memory":0.1}},
            {"id":"st","entity_type":"Storage","components":{"cpu":0.1,"memory":0.1}},
            {"id":"v","entity_type":"VM","components":{"cpu":0.1,"memory":0.1}}
        ]}"#;
        let doc = parse(json).unwrap();
        let c = compile(doc).unwrap();
        assert_eq!(c.entities[0].entity_type, EntityType::Server);
        assert_eq!(c.entities[1].entity_type, EntityType::Switch);
        assert_eq!(c.entities[2].entity_type, EntityType::Storage);
        assert_eq!(c.entities[3].entity_type, EntityType::Vm);
    }

    #[test]
    fn topology_links_compile() {
        let json = r#"{"version":"1.0","pack_id":"t",
            "entities":[
                {"id":"s1","entity_type":"Server","components":{"cpu":0.1,"memory":0.1}},
                {"id":"sw1","entity_type":"Switch","components":{"cpu":0.1,"memory":0.1}}
            ],
            "topology":{"links":[
                {"from":"s1","to":"sw1","bandwidth_gbps":10.0}
            ]}}"#;
        let doc = parse(json).unwrap();
        validate(&doc).unwrap();
        let c = compile(doc).unwrap();
        assert_eq!(c.links.len(), 1);
        assert_eq!(c.links[0].from, "s1");
        assert_eq!(c.links[0].to, "sw1");
        assert!((c.links[0].bandwidth_gbps - 10.0).abs() < 1e-6);
    }

    #[test]
    fn no_topology_yields_empty_links() {
        let doc = parse(
            r#"{"version":"1.0","pack_id":"t","entities":[
            {"id":"x","entity_type":"Server","components":{"cpu":0.1,"memory":0.2}}]}"#,
        )
        .unwrap();
        let c = compile(doc).unwrap();
        assert!(c.links.is_empty());
    }

    #[test]
    fn pack_id_preserved() {
        let doc = parse(
            r#"{"version":"1.0","pack_id":"my-special-pack","entities":[
            {"id":"x","entity_type":"Server","components":{"cpu":0.1,"memory":0.2}}]}"#,
        )
        .unwrap();
        let c = compile(doc).unwrap();
        assert_eq!(c.pack_id, "my-special-pack");
    }

    #[test]
    fn component_values_preserved() {
        let json = r#"{"version":"1.0","pack_id":"t","entities":[
            {"id":"x","entity_type":"Server","components":{
                "cpu":0.45,"memory":0.67,"cpu_cores":16,"memory_gb":128.0,
                "network_tx":0.5,"network_rx":0.3}}]}"#;
        let doc = parse(json).unwrap();
        let c = compile(doc).unwrap();
        let comp = &c.entities[0].components;
        assert!((comp.cpu - 0.45).abs() < 1e-6);
        assert!((comp.memory - 0.67).abs() < 1e-6);
        assert_eq!(comp.cpu_cores, 16);
        assert!((comp.memory_gb - 128.0).abs() < 1e-6);
        assert!((comp.network_tx - 0.5).abs() < 1e-6);
        assert!((comp.network_rx - 0.3).abs() < 1e-6);
    }
}
