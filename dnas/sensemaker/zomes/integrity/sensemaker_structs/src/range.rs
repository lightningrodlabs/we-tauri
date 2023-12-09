use crate::{Threshold, ThresholdKind};
use hdi::prelude::*;
use std::cmp::Ordering;

#[hdk_entry_helper]
#[derive(Clone)]
pub struct Range {
    pub name: String,
    pub kind: RangeKind,
    // not sure what `RangeValueVariant` would be used for. Leaving out for now.
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum RangeKind {
    Integer { min: u32, max: u32 },
    Float { min: f64, max: f64 },
    // Tag(Vec<String>),
    // Emoji(Vec<char>),
    // TagTree(HashMap<String, String>)
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum RangeValue {
    Integer(u32),
    Float(f64),
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
                    Err(wasm_error!(WasmErrorInner::Guest(String::from(
                        "incompatible range types for threshold comparison"
                    ))))
                }
            }
            RangeValue::Float(self_value) => {
                let other_range_value = threshold.value;
                if let RangeValue::Float(other_value) = other_range_value {
                    match threshold.kind {
                        ThresholdKind::GreaterThan => Ok(*self_value > other_value),
                        ThresholdKind::LessThan => Ok(*self_value < other_value),
                        ThresholdKind::Equal => Ok(*self_value == other_value),
                    }
                }
                // could put `if else` here for compatible range types that are not the same
                else {
                    Err(wasm_error!(WasmErrorInner::Guest(String::from(
                        "incompatible range types for threshold comparison"
                    ))))
                }

            },
        }
    }

    pub fn compare(&self, other_range_value: RangeValue) -> ExternResult<Ordering> {
        match self {
            RangeValue::Integer(self_value) => {
                if let RangeValue::Integer(other_value) = other_range_value {
                    Ok(self_value.cmp(&other_value))
                }
                // could put `if else` here for compatible range types that are not the same
                else {
                    Err(wasm_error!(WasmErrorInner::Guest(String::from(
                        "incompatible range types for comparison"
                    ))))
                }
            }
            RangeValue::Float(_) => Ok(Ordering::Equal), // TODO: fix this along with other range value types
        }
    }
}
