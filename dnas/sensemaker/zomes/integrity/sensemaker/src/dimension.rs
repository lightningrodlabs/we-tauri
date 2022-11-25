use std::cmp::Ordering;

use hdi::prelude::*;

use crate::{ThresholdKind, Threshold};
// use std::collections::HashMap;

#[hdk_entry_helper]
#[derive(Clone)]
pub struct Dimension {
    pub name: String,
    pub range: Range,
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
    Float(f32),
    // Tag(String),
    // Emoji(char),
    // TagTree((String, String))
}

impl RangeValue {
    pub fn meets_threshold(&self, threshold: Threshold) -> ExternResult<bool> {
        // check that same variant type
        match self {
            RangeValue::Integer(self_value) => {
                let other_range_value = threshold.value;
                if let RangeValue::Integer(other_value) = other_range_value {
                    match threshold.kind {
                        ThresholdKind::GreaterThan => Ok(*self_value > other_value),
                        ThresholdKind::LessThan => Ok(*self_value < other_value),
                        ThresholdKind::Equal => Ok(*self_value == other_value),
                    }
                }
                // could put `if else` here for compatible range types that are not the same
                else {
                    Err(wasm_error!(WasmErrorInner::Guest(String::from("incompatible range types for threshold comparison"))))
                }
            },
            RangeValue::Float(_) => Ok(false),
        }
    }

    pub fn compare(&self, other_range_value: RangeValue) -> Ordering {
        match self {
            RangeValue::Integer(self_value) => {
                if let RangeValue::Integer(other_value) = other_range_value {
                    self_value.cmp(&other_value)
                }
                // could put `if else` here for compatible range types that are not the same
                else {
                    // Err(wasm_error!(WasmErrorInner::Guest(String::from("incompatible range types for comparison"))))
                    Ordering::Equal
                }
            },
            RangeValue::Float(_) => Ordering::Equal, // TODO: fix this along with other range value types
        }

    }
}
