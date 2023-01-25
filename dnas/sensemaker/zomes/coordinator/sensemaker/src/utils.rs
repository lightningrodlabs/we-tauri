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

pub fn try_from_entry<T: TryFrom<SerializedBytes>>(entry: Entry) -> ExternResult<T> {
    match entry {
        Entry::App(content) => match T::try_from(content.into_sb()) {
            Ok(e) => Ok(e),
            Err(_) => Err(wasm_error!(WasmErrorInner::Guest(String::from(
                "Could not convert entry"
            )))),
        },
        _ => Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "Entry is not an app entry"
        )))),
    }
}

// NOTE: when using the to get objective assessments, we need to clarify what it means for multiple objective assessments to be created for a resource
// do we always assume the most up to date? how will these affect checking against thresholds?
pub fn get_assessments_for_resource_inner(
    resource_eh: EntryHash,
    dimension_ehs: Vec<EntryHash>,
) -> ExternResult<BTreeMap<EntryHash, Vec<Assessment>>> {
    let mut assessments: BTreeMap<EntryHash, Vec<Assessment>> = BTreeMap::new();
    for dimension_eh in dimension_ehs {
        let mut dimension_assessments: Vec<Assessment> = Vec::new();
        let links = get_links(
            assessment_typed_path(resource_eh.clone(), dimension_eh.clone())?.path_entry_hash()?,
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

// flatten a btree map into flat vec for convenience
pub fn flatten_btree_map<K, V: Clone>(btree_map: BTreeMap<K, Vec<V>>) -> Vec<V> {
    btree_map
        .values()
        .map(|vec| vec.clone())
        .collect::<Vec<Vec<V>>>()
        .into_iter()
        .flatten()
        .collect::<Vec<V>>()
}
