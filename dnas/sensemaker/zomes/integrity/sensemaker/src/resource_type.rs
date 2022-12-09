use hdi::prelude::*;

use crate::properties::ConfigResourceType;

#[hdk_entry_helper]
#[derive(Clone)]
pub struct ResourceType {
    pub name: String,
    pub base_types: Vec<(DnaHash, AppEntryType)>,
    pub dimension_ehs: Vec<EntryHash>,
}

impl TryFrom<ConfigResourceType> for ResourceType {
    type Error = WasmError;
    fn try_from(value: ConfigResourceType) -> Result<Self, Self::Error> {
        let dimension_ehs = value
            .dimensions
            .into_iter()
            .map(|dimension| hash_entry(dimension))
            .collect::<ExternResult<Vec<EntryHash>>>()?;
        let resource_type = ResourceType {
            name: value.name,
            base_types: value.base_types,
            dimension_ehs,
        };
        Ok(resource_type)
    }
}
