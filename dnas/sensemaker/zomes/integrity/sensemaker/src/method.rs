use std::collections::BTreeMap;

use hdi::prelude::*;

use crate::{applet::ConfigMethod, ResourceDef};

#[hdk_entry_helper]
#[derive(Clone)]
pub struct Method {
    pub name: String,
    pub target_resource_def_eh: EntryHash,
    pub input_dimension_ehs: Vec<EntryHash>, // Validation: make sure it is subjective
    pub output_dimension_eh: EntryHash,      // Validation: make sure it is objective
    pub program: Program,                    // making enum for now, in design doc it is `AST`
    pub can_compute_live: bool,
    pub must_publish_dataset: bool,
}

impl TryFrom<ConfigMethod> for Method {
    type Error = WasmError;
    fn try_from(value: ConfigMethod) -> Result<Self, Self::Error> {
        let input_dimension_ehs = value
            .input_dimensions
            .into_iter()
            .map(|dimension| hash_entry(dimension))
            .collect::<ExternResult<Vec<EntryHash>>>()?;
        let output_dimension_eh = hash_entry(value.output_dimension)?;
        let resource: ResourceDef = value.target_resource_def.try_into()?;
        let method = Method {
            name: value.name,
            target_resource_def_eh: hash_entry(resource)?,
            input_dimension_ehs,
            output_dimension_eh,
            program: value.program,
            can_compute_live: value.can_compute_live,
            must_publish_dataset: value.must_publish_dataset,
        };
        Ok(method)
    }
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
