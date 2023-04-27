use std::collections::BTreeMap;

use hdk::prelude::*;
use sensemaker_integrity::{AppletConfig, Assessment, LinkTypes};

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

pub fn fetch_provider_resource(
    resource_eh: EntryHash,
    resource_def_eh: EntryHash,
) -> ExternResult<Option<Record>> {
    // make a bridge call to the provider zome
    let links = get_links(
        resource_def_eh.clone(),
        LinkTypes::ResourceDefEhToAppletConfig,
        None,
    )?;
    let maybe_link = links.last();
    if let Some(link) = maybe_link {
        let maybe_record = get(EntryHash::from(link.target.clone()), GetOptions::default())?;
        if let Some(record) = maybe_record {
            let applet_config = entry_from_record::<AppletConfig>(record)?;
            if let Some(role_name) = applet_config.role_name {
                let response = call(
                    CallTargetCell::OtherRole(role_name),
                    ZomeName::from("test_provider"),
                    "get_resource".into(),
                    None,
                    resource_eh,
                )?;
                match response {
                    ZomeCallResponse::Ok(result) => {
                        let maybe_record: Option<Record> = result
                            .decode()
                            .map_err(|err| wasm_error!(WasmErrorInner::from(err)))?;

                        Ok(maybe_record)
                    }
                    _ => Err(wasm_error!(WasmErrorInner::Guest(
                        "Error making the bridge call to provider dna".into()
                    ))),
                }
            } else {
                // resource type is not associated with a provider dna
                // this only occurs when applet config is created during the init() callback
                Ok(None)
            }
        } else {
            // could not get the applet config
            Ok(None)
        }
    } else {
        // there is no link to applet config from the resource type eh
        Ok(None)
    }
}

pub fn reduce_assessments_to_latest(mut assessments: Vec<Assessment>) -> Vec<Assessment> {
    // Sort the assessments by timestamp in descending order
    assessments.sort_by_key(|a| std::cmp::Reverse(a.timestamp));

    // Use a hash set to keep track of which dimension_eh values have already been added
    let mut seen_dimension_eh = std::collections::HashSet::new();

    // Filter the assessments to include only the most recent assessment for each unique dimension_eh value
    let filtered_assessments = assessments.into_iter().filter(|a| {
        if seen_dimension_eh.contains(&a.dimension_eh) {
            false
        } else {
            seen_dimension_eh.insert(a.dimension_eh.clone());
            true
        }
    }).collect();

    filtered_assessments
}
