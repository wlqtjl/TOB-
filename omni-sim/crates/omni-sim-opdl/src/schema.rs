/// Serde-deserialised representation of a raw OPDL JSON document.
/// All fields map 1-to-1 with the OPDL v1.0 schema defined in §4.
/// Validation is intentionally NOT performed here — see `validator.rs`.
///
/// M-05 FIX: derive Clone so validator tests can clone entities for duplicate-id testing.
#[derive(Debug, Clone, serde::Deserialize)]
pub struct OpdlDocument {
    pub version: String,
    pub pack_id: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub author: Option<String>,
    pub entities: Vec<OpdlEntity>,
    #[serde(default)]
    pub topology: Option<OpdlTopology>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct OpdlEntity {
    pub id: String,
    pub entity_type: String,
    #[serde(default)]
    pub label: Option<String>,
    pub components: OpdlComponents,
    #[serde(default)]
    pub behaviors: OpdlBehaviors,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Default, Clone, serde::Deserialize)]
pub struct OpdlComponents {
    #[serde(default)]
    pub cpu: f32,
    #[serde(default)]
    pub memory: f32,
    #[serde(default = "default_cores")]
    pub cpu_cores: u8,
    #[serde(default)]
    pub memory_gb: f32,
    #[serde(default)]
    pub network_tx: f32,
    #[serde(default)]
    pub network_rx: f32,
}

fn default_cores() -> u8 {
    1
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct OpdlBehaviors {
    #[serde(default = "default_growth")]
    pub cpu_growth_rate: f32,
    #[serde(default = "default_burst")]
    pub burst_threshold: f32,
}

fn default_growth() -> f32 {
    0.01
}
fn default_burst() -> f32 {
    0.9
}

impl Default for OpdlBehaviors {
    fn default() -> Self {
        Self {
            cpu_growth_rate: default_growth(),
            burst_threshold: default_burst(),
        }
    }
}

#[derive(Debug, Default, Clone, serde::Deserialize)]
pub struct OpdlTopology {
    #[serde(default)]
    pub links: Vec<OpdlLink>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct OpdlLink {
    pub from: String,
    pub to: String,
    #[serde(default)]
    pub bandwidth_gbps: f32,
}
