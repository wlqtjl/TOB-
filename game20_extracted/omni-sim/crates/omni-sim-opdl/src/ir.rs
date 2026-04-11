/// Internal Representation — produced after validation, before world spawn.
/// All values are guaranteed in-range; no further checks needed downstream.
use crate::components_stub::{BehavC, EntityType};

#[derive(Debug, Clone)]
pub struct EntityIr {
    pub id: String,
    pub entity_type: EntityType,
    pub components: ComponentsIr,
    pub behavior: BehavC,
}

#[derive(Debug, Clone, Copy)]
pub struct ComponentsIr {
    pub cpu: f32, pub memory: f32,
    pub cpu_cores: u8, pub memory_gb: f32,
    pub network_tx: f32, pub network_rx: f32,
}

#[derive(Debug, Clone)]
pub struct LinkIr { pub from: String, pub to: String, pub bandwidth_gbps: f32 }

#[derive(Debug)]
pub struct CompiledDocument {
    pub pack_id: String,
    pub entities: Vec<EntityIr>,
    pub links: Vec<LinkIr>,
}
