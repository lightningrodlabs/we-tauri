use std::collections::BTreeMap;

use hdi::prelude::*;

#[hdk_entry_helper]
#[derive(Clone)]
pub struct Method {
    pub name: String,
    pub target_resource_type_eh: EntryHash,
    pub input_dimension_ehs: Vec<EntryHash>, // Validation: make sure it is subjective
    pub output_dimension_eh: EntryHash,      // Validation: make sure it is objective
    pub program: Program,                    // making enum for now, in design doc it is `AST`
    pub can_compute_live: bool,
    pub must_publish_dataset: bool,
}

#[hdk_entry_helper]
#[derive(Clone)]
pub struct DataSet {
    pub from: EntryHash,                                  // method
    pub data_points: BTreeMap<EntryHash, Vec<EntryHash>>, //<DimensionEh, Vec<AssessmentEh>>
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum Program {
    Sum,
    Average,
}
