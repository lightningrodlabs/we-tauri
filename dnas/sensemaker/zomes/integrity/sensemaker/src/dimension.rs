use hdi::prelude::*;

#[hdk_entry_helper]
#[derive(Clone)]
pub struct Dimension {
    pub name: String,
    pub range: Range,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Range {
    pub name: String,
    pub kind: RangeKind,
    //not sure what `RangeValueVariant` would be used for. Leaving out for now.
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum RangeKind {
    Integer { min: u32, max: u32 },
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum RangeValue {
    Integer(u32),
}