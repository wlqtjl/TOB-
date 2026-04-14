use crate::schema::OpdlDocument;

/// All semantic errors discovered during OPDL validation.
/// The compiler collects the full list before returning, so the caller
/// receives every problem at once rather than failing on the first.
#[derive(Debug, thiserror::Error)]
pub enum ValidationError {
    #[error("version must be \"1.0\", got \"{got}\"")]
    UnsupportedVersion { got: String },

    #[error("pack_id \"{id}\" contains invalid characters (must match ^[a-z0-9-]+$)")]
    InvalidPackId { id: String },

    #[error("entity count {n} exceeds the maximum of 100,000")]
    TooManyEntities { n: usize },

    #[error("entity count must be at least 1")]
    EmptyEntityList,

    #[error("entity \"{id}\" has duplicate ID")]
    DuplicateId { id: String },

    #[error("entity \"{id}\" has unsupported entity_type \"{t}\"")]
    UnknownType { id: String, t: String },

    #[error("entity \"{id}\" has cpu={val} which is outside [0.0, 1.0]")]
    CpuOutOfRange { id: String, val: f32 },

    #[error("entity \"{id}\" has memory={val} which is outside [0.0, 1.0]")]
    MemoryOutOfRange { id: String, val: f32 },

    #[error("entity \"{id}\" has cpu_cores=0, minimum is 1")]
    ZeroCores { id: String },

    #[error("entity \"{id}\" has cpu_growth_rate={val} outside [-1.0, 1.0]")]
    GrowthRateOutOfRange { id: String, val: f32 },

    #[error("topology link references unknown entity \"{id}\"")]
    UnknownLinkEndpoint { id: String },

    /// L-08 FIX: zero or negative bandwidth is meaningless for production links.
    #[error(
        "topology link from \"{from}\" to \"{to}\" has bandwidth_gbps={val} which must be > 0"
    )]
    ZeroBandwidth { from: String, to: String, val: f32 },
}

const VALID_ENTITY_TYPES: &[&str] = &["Server", "Switch", "Storage", "VM"];

/// Validate an `OpdlDocument` and return either `Ok(())` or the full list of
/// semantic errors found.  The caller can then decide whether to abort or
/// present all errors at once.
pub fn validate(doc: &OpdlDocument) -> Result<(), Vec<ValidationError>> {
    let mut errors: Vec<ValidationError> = Vec::new();

    // --- Version ---
    if doc.version != "1.0" {
        errors.push(ValidationError::UnsupportedVersion {
            got: doc.version.clone(),
        });
    }

    // --- pack_id ---
    // M-02 FIX: reject empty pack_id (empty iterator `.all()` returns true).
    if doc.pack_id.is_empty()
        || !doc
            .pack_id
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
    {
        errors.push(ValidationError::InvalidPackId {
            id: doc.pack_id.clone(),
        });
    }

    // --- Entity count ---
    if doc.entities.is_empty() {
        errors.push(ValidationError::EmptyEntityList);
    } else if doc.entities.len() > 100_000 {
        errors.push(ValidationError::TooManyEntities {
            n: doc.entities.len(),
        });
    }

    // --- Per-entity rules ---
    let mut seen_ids = std::collections::HashSet::new();

    for e in &doc.entities {
        if !seen_ids.insert(e.id.as_str()) {
            errors.push(ValidationError::DuplicateId { id: e.id.clone() });
        }

        if !VALID_ENTITY_TYPES.contains(&e.entity_type.as_str()) {
            errors.push(ValidationError::UnknownType {
                id: e.id.clone(),
                t: e.entity_type.clone(),
            });
        }

        if !(0.0..=1.0).contains(&e.components.cpu) {
            errors.push(ValidationError::CpuOutOfRange {
                id: e.id.clone(),
                val: e.components.cpu,
            });
        }

        if !(0.0..=1.0).contains(&e.components.memory) {
            errors.push(ValidationError::MemoryOutOfRange {
                id: e.id.clone(),
                val: e.components.memory,
            });
        }

        if e.components.cpu_cores == 0 {
            errors.push(ValidationError::ZeroCores { id: e.id.clone() });
        }

        if !(-1.0..=1.0).contains(&e.behaviors.cpu_growth_rate) {
            errors.push(ValidationError::GrowthRateOutOfRange {
                id: e.id.clone(),
                val: e.behaviors.cpu_growth_rate,
            });
        }
    }

    // --- Topology referential integrity ---
    if let Some(topo) = &doc.topology {
        for link in &topo.links {
            if !seen_ids.contains(link.from.as_str()) {
                errors.push(ValidationError::UnknownLinkEndpoint {
                    id: link.from.clone(),
                });
            }
            if !seen_ids.contains(link.to.as_str()) {
                errors.push(ValidationError::UnknownLinkEndpoint {
                    id: link.to.clone(),
                });
            }
            // L-08 FIX: zero or negative bandwidth is meaningless.
            if link.bandwidth_gbps <= 0.0 {
                errors.push(ValidationError::ZeroBandwidth {
                    from: link.from.clone(),
                    to: link.to.clone(),
                    val: link.bandwidth_gbps,
                });
            }
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::schema::{OpdlComponents, OpdlDocument, OpdlEntity};

    fn minimal_doc(cpu: f32, memory: f32) -> OpdlDocument {
        OpdlDocument {
            version: "1.0".into(),
            pack_id: "test-pack".into(),
            description: None,
            author: None,
            topology: None,
            entities: vec![OpdlEntity {
                id: "n1".into(),
                entity_type: "Server".into(),
                label: None,
                tags: vec![],
                components: OpdlComponents {
                    cpu,
                    memory,
                    cpu_cores: 4,
                    memory_gb: 64.0,
                    network_tx: 0.0,
                    network_rx: 0.0,
                },
                behaviors: Default::default(),
            }],
        }
    }

    #[test]
    fn valid_doc_passes() {
        assert!(validate(&minimal_doc(0.2, 0.3)).is_ok());
    }

    #[test]
    fn cpu_out_of_range_fails() {
        let errs = validate(&minimal_doc(1.5, 0.3)).unwrap_err();
        assert!(errs
            .iter()
            .any(|e| matches!(e, ValidationError::CpuOutOfRange { .. })));
    }

    #[test]
    fn memory_out_of_range_fails() {
        let errs = validate(&minimal_doc(0.3, -0.1)).unwrap_err();
        assert!(errs
            .iter()
            .any(|e| matches!(e, ValidationError::MemoryOutOfRange { .. })));
    }

    #[test]
    fn duplicate_id_detected() {
        let mut doc = minimal_doc(0.2, 0.3);
        doc.entities.push(doc.entities[0].clone());
        let errs = validate(&doc).unwrap_err();
        assert!(errs
            .iter()
            .any(|e| matches!(e, ValidationError::DuplicateId { .. })));
    }

    #[test]
    fn empty_entity_list_fails() {
        let mut doc = minimal_doc(0.2, 0.3);
        doc.entities.clear();
        let errs = validate(&doc).unwrap_err();
        assert!(errs
            .iter()
            .any(|e| matches!(e, ValidationError::EmptyEntityList)));
    }

    #[test]
    fn unknown_type_fails() {
        let mut doc = minimal_doc(0.2, 0.3);
        doc.entities[0].entity_type = "Robot".into();
        let errs = validate(&doc).unwrap_err();
        assert!(errs
            .iter()
            .any(|e| matches!(e, ValidationError::UnknownType { .. })));
    }

    #[test]
    fn wrong_version_fails() {
        let mut doc = minimal_doc(0.2, 0.3);
        doc.version = "2.0".into();
        let errs = validate(&doc).unwrap_err();
        assert!(errs
            .iter()
            .any(|e| matches!(e, ValidationError::UnsupportedVersion { .. })));
    }

    #[test]
    fn empty_pack_id_fails() {
        let mut doc = minimal_doc(0.2, 0.3);
        doc.pack_id = "".into();
        let errs = validate(&doc).unwrap_err();
        assert!(errs
            .iter()
            .any(|e| matches!(e, ValidationError::InvalidPackId { .. })));
    }

    #[test]
    fn pack_id_with_uppercase_fails() {
        let mut doc = minimal_doc(0.2, 0.3);
        doc.pack_id = "Bad-Pack".into();
        let errs = validate(&doc).unwrap_err();
        assert!(errs
            .iter()
            .any(|e| matches!(e, ValidationError::InvalidPackId { .. })));
    }

    #[test]
    fn pack_id_with_special_chars_fails() {
        let mut doc = minimal_doc(0.2, 0.3);
        doc.pack_id = "pack_id!".into();
        let errs = validate(&doc).unwrap_err();
        assert!(errs
            .iter()
            .any(|e| matches!(e, ValidationError::InvalidPackId { .. })));
    }

    #[test]
    fn zero_cores_fails() {
        let mut doc = minimal_doc(0.2, 0.3);
        doc.entities[0].components.cpu_cores = 0;
        let errs = validate(&doc).unwrap_err();
        assert!(errs
            .iter()
            .any(|e| matches!(e, ValidationError::ZeroCores { .. })));
    }

    #[test]
    fn growth_rate_out_of_range_fails() {
        let mut doc = minimal_doc(0.2, 0.3);
        doc.entities[0].behaviors.cpu_growth_rate = 2.0;
        let errs = validate(&doc).unwrap_err();
        assert!(errs
            .iter()
            .any(|e| matches!(e, ValidationError::GrowthRateOutOfRange { .. })));
    }

    #[test]
    fn negative_growth_rate_out_of_range_fails() {
        let mut doc = minimal_doc(0.2, 0.3);
        doc.entities[0].behaviors.cpu_growth_rate = -1.5;
        let errs = validate(&doc).unwrap_err();
        assert!(errs
            .iter()
            .any(|e| matches!(e, ValidationError::GrowthRateOutOfRange { .. })));
    }

    #[test]
    fn unknown_link_endpoint_fails() {
        use crate::schema::{OpdlLink, OpdlTopology};
        let mut doc = minimal_doc(0.2, 0.3);
        doc.topology = Some(OpdlTopology {
            links: vec![OpdlLink {
                from: "n1".into(),
                to: "nonexistent".into(),
                bandwidth_gbps: 10.0,
            }],
        });
        let errs = validate(&doc).unwrap_err();
        assert!(errs
            .iter()
            .any(|e| matches!(e, ValidationError::UnknownLinkEndpoint { .. })));
    }

    #[test]
    fn zero_bandwidth_fails() {
        use crate::schema::{OpdlLink, OpdlTopology};
        let mut doc = minimal_doc(0.2, 0.3);
        // Add a second entity for a valid link pair
        doc.entities.push(OpdlEntity {
            id: "n2".into(),
            entity_type: "Switch".into(),
            label: None,
            tags: vec![],
            components: OpdlComponents {
                cpu: 0.1,
                memory: 0.1,
                cpu_cores: 2,
                memory_gb: 8.0,
                network_tx: 0.0,
                network_rx: 0.0,
            },
            behaviors: Default::default(),
        });
        doc.topology = Some(OpdlTopology {
            links: vec![OpdlLink {
                from: "n1".into(),
                to: "n2".into(),
                bandwidth_gbps: 0.0,
            }],
        });
        let errs = validate(&doc).unwrap_err();
        assert!(errs
            .iter()
            .any(|e| matches!(e, ValidationError::ZeroBandwidth { .. })));
    }

    #[test]
    fn negative_bandwidth_fails() {
        use crate::schema::{OpdlLink, OpdlTopology};
        let mut doc = minimal_doc(0.2, 0.3);
        doc.entities.push(OpdlEntity {
            id: "n2".into(),
            entity_type: "Switch".into(),
            label: None,
            tags: vec![],
            components: OpdlComponents {
                cpu: 0.1,
                memory: 0.1,
                cpu_cores: 2,
                memory_gb: 8.0,
                network_tx: 0.0,
                network_rx: 0.0,
            },
            behaviors: Default::default(),
        });
        doc.topology = Some(OpdlTopology {
            links: vec![OpdlLink {
                from: "n1".into(),
                to: "n2".into(),
                bandwidth_gbps: -5.0,
            }],
        });
        let errs = validate(&doc).unwrap_err();
        assert!(errs
            .iter()
            .any(|e| matches!(e, ValidationError::ZeroBandwidth { .. })));
    }

    #[test]
    fn multiple_errors_collected() {
        let mut doc = minimal_doc(1.5, -0.1); // both cpu and memory out of range
        doc.entities[0].components.cpu_cores = 0; // zero cores
        doc.entities[0].behaviors.cpu_growth_rate = 5.0; // growth rate out of range
        let errs = validate(&doc).unwrap_err();
        assert!(
            errs.len() >= 4,
            "expected at least 4 errors, got {}",
            errs.len()
        );
    }

    #[test]
    fn boundary_cpu_zero_passes() {
        assert!(validate(&minimal_doc(0.0, 0.3)).is_ok());
    }

    #[test]
    fn boundary_cpu_one_passes() {
        assert!(validate(&minimal_doc(1.0, 0.3)).is_ok());
    }

    #[test]
    fn boundary_memory_zero_passes() {
        assert!(validate(&minimal_doc(0.2, 0.0)).is_ok());
    }

    #[test]
    fn boundary_memory_one_passes() {
        assert!(validate(&minimal_doc(0.2, 1.0)).is_ok());
    }

    #[test]
    fn valid_pack_id_with_hyphens_and_digits() {
        let mut doc = minimal_doc(0.2, 0.3);
        doc.pack_id = "my-pack-123".into();
        assert!(validate(&doc).is_ok());
    }
}
