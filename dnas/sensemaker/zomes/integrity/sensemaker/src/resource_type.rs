use hdi::prelude::*;

use crate::applet::ConfigResourceDef;

#[hdk_entry_helper]
#[derive(Clone)]
pub struct ResourceDef {
    pub name: String,
    pub base_types: Vec<AppEntryDef>,
    pub dimension_ehs: Vec<EntryHash>,
}

impl TryFrom<ConfigResourceDef> for ResourceDef {
    type Error = WasmError;
    fn try_from(value: ConfigResourceDef) -> Result<Self, Self::Error> {
        let dimension_ehs = value
            .dimensions
            .into_iter()
            .map(|dimension| hash_entry(dimension))
            .collect::<ExternResult<Vec<EntryHash>>>()?;
        let resource_type = ResourceDef {
            name: value.name,
            base_types: value.base_types,
            dimension_ehs,
        };
        Ok(resource_type)
    }
}
