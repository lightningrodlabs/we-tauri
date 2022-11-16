use hdi::prelude::*;

use crate::range::RangeValue;

#[hdk_entry_helper]
#[derive(Clone)]
pub struct CulturalContext {
    pub name: String,
    pub resource_type_eh: EntryHash,
    pub thresholds: Vec<Threshold>,
    pub order_by: Vec<(EntryHash, OrderingKind)>, // DimensionEh
}

#[hdk_entry_helper]
#[derive(Clone)]
pub struct ContextResult {
    pub context_eh: EntryHash,
    pub dimension_ehs: Vec<EntryHash>, // of objective dimensions
    pub result: Vec<(EntryHash, Vec<RangeValue>)>,
}

#[hdk_entry_helper]
#[derive(Clone)]
pub struct Threshold {
    pub dimension_eh: EntryHash,
    kind: ThresholdKind,
    value: RangeValue,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum OrderingKind {
    Biggest,
    Smallest,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ThresholdKind {
    GreaterThan,
    LessThan,
    Equal,
}

