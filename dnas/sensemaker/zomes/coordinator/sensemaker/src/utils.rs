use std::collections::BTreeMap;

use hdk::prelude::*;
use sensemaker_integrity::{Assessment, LinkTypes};

use crate::{assessment_typed_path, get_assessment};

pub fn entry_from_record<T: TryFrom<SerializedBytes, Error = SerializedBytesError>>(
    record: Record,
) -> ExternResult<T> {
    Ok(record
        .entry()
        .to_app_option()
        // .map_err(|err| wasm_error!(err.into()))?
        .map_err(|err| wasm_error!(WasmErrorInner::from(err)))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Malformed bytes"
        ))))?)
}

pub fn get_assessments_for_resource(resource_eh: EntryHash, dimension_ehs: Vec<EntryHash>) -> ExternResult<BTreeMap<EntryHash, Vec<Assessment>>> {
        let mut assessments: BTreeMap<EntryHash, Vec<Assessment>> = BTreeMap::new();
        for dimension_eh in dimension_ehs {
            let mut dimension_assessments: Vec<Assessment> = Vec::new();
            let links = get_links(
                assessment_typed_path(resource_eh.clone(), dimension_eh.clone())?
                    .path_entry_hash()?,
                LinkTypes::Assessment,
                None,
            )?;
            for link in links {
                let maybe_assessment = get_assessment(EntryHash::from(link.target))?;
                if let Some(record) = maybe_assessment {
                    let assessment = entry_from_record::<Assessment>(record)?;
                    dimension_assessments.push(assessment)
                }
            }
            assessments.insert(dimension_eh.clone(), dimension_assessments);
        }
        Ok(assessments)
}
