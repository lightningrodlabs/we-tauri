use std::collections::BTreeMap;

use hdk::prelude::*;
use sensemaker_integrity::{
    Assessment, CulturalContext, Dimension, EntryTypes, LinkTypes, Method, RawSensemakerConfig,
    ResourceType, SensemakerConfig,
};

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

// create all entries specified in the config
pub fn create_entries_from_config(
    config: RawSensemakerConfig,
    ca_key: AgentPubKey,
) -> ExternResult<EntryHash> {
    // dimensions
    let _dimension_ehs = config
        .dimensions
        .clone()
        .into_iter()
        .map(|dimension: Dimension| create_entry(&EntryTypes::Dimension(dimension)))
        .collect::<ExternResult<Vec<ActionHash>>>()?;

    // resource types
    let _resource_type_ehs = config
        .resources
        .clone()
        .into_iter()
        .map(|resource| {
            let converted_resource_type = ResourceType::try_from(resource)?;
            create_entry(&EntryTypes::ResourceType(converted_resource_type))
        })
        .collect::<ExternResult<Vec<ActionHash>>>()?;

    // methods
    let _method_ehs = config
        .methods
        .clone()
        .into_iter()
        .map(|method| {
            let converted_method = Method::try_from(method)?;
            create_entry(&EntryTypes::Method(converted_method))
        })
        .collect::<ExternResult<Vec<ActionHash>>>()?;

    // contexts
    let _context_ehs = config
        .contexts
        .clone()
        .into_iter()
        .map(|context| {
            let converted_context = CulturalContext::try_from(context)?;
            create_entry(&EntryTypes::CulturalContext(converted_context))
        })
        .collect::<ExternResult<Vec<ActionHash>>>()?;

    // create the config entry and link it off of the community activator

    let converted_config = SensemakerConfig::try_from(config)?;
    create_entry(&EntryTypes::SensemakerConfig(converted_config.clone()))?;
    create_link(
        ca_key,
        hash_entry(converted_config.clone())?,
        LinkTypes::CAToSensemakerConfig,
        (),
    )?;
    let config_eh = hash_entry(converted_config)?;
    Ok(config_eh)
}
