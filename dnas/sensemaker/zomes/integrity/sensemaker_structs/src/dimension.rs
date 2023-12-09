use hdi::prelude::*;

use crate::applet::ConfigDimension;

#[hdk_entry_helper]
#[derive(Clone)]
pub struct Dimension {
    pub name: String,
    pub range_eh: EntryHash,
    // identifies whether a dimension is objective or subjective
    // can be used to validate dimensions ehs being passed as io in method
    pub computed: bool,
}

impl TryFrom<ConfigDimension> for Dimension {
    type Error = WasmError;
    fn try_from(value: ConfigDimension) -> Result<Self, Self::Error> {
        let dimension = Dimension {
            name: value.name,
            range_eh: hash_entry(value.range)?,
            computed: value.computed,
        };
        Ok(dimension)
    }
}
