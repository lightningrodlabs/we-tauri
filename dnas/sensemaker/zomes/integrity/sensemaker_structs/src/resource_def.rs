use hdi::prelude::*;

use crate::applet::ConfigResourceDef;

#[hdk_entry_helper]
#[derive(Clone)]
pub struct ResourceDef {
    pub resource_name: String,
    pub base_types: Vec<AppEntryDef>,
    pub role_name: String,
    pub zome_name: String,
}

impl TryFrom<ConfigResourceDef> for ResourceDef {
    type Error = WasmError;
    fn try_from(value: ConfigResourceDef) -> Result<Self, Self::Error> {
        let resource_def = ResourceDef {
            resource_name: value.resource_name,
            base_types: value.base_types,
            role_name: value.role_name,
            zome_name: value.zome_name,
        };
        Ok(resource_def)
    }
}
