use hdi::prelude::*;
// use std::collections::HashMap;

#[hdk_entry_helper]
#[derive(Clone)]
pub struct Dimension {
    pub name: String,
    pub range_eh: EntryHash,
}

#[hdk_entry_helper]
#[derive(Clone)]
pub struct Range {
    pub name: String,
    pub kind: RangeKind,
    //not sure what `RangeValueVariant` would be used for. Leaving out for now.
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum RangeKind {
    Integer { min: u32, max: u32 },
    // Float {min: f32, max: f32},
    // Tag(Vec<String>),
    // Emoji(Vec<char>),
    // TagTree(HashMap<String, String>)

}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum RangeValue {
    Integer(u32),
    // Float(f32),
    // Tag(String),
    // Emoji(char),
    // TagTree((String, String))
}