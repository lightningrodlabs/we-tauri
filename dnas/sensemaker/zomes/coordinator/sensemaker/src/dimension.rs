use hdk::prelude::*;
use sensemaker_integrity::{Dimension, EntryTypes, LinkTypes, PartialMethod, Method};

use crate::create_method;

#[hdk_extern]
pub fn create_dimension(dimension: Dimension) -> ExternResult<Record> {
    let action_hash = create_entry(&EntryTypes::Dimension(dimension.clone()))?;
    let dimension_eh = hash_entry(&EntryTypes::Dimension(dimension.clone()))?;
    let record = get(action_hash.clone(), GetOptions::default())?;
    if let Some(record) = record {
        create_link(
            dimensions_typed_path()?.path_entry_hash()?,
            dimension_eh.clone(),
            LinkTypes::Dimensions,
            (),
        )?;
        Ok(record)
    } else {
        Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "not able to get dimension record after create"
        ))))
    }
}

#[hdk_extern]
pub fn get_dimension(entry_hash: EntryHash) -> ExternResult<Option<Record>> {
    get(entry_hash, GetOptions::default())
}

// Atomic creation of output dimension and method:
// returning a tuple of two records, or throwing an error and preventing any DHT op
#[hdk_extern]
pub fn atomic_create_dimension_with_method(AtomicDimensionMethodInput{ output_dimension, partial_method: PartialMethod { name, input_dimension_ehs, program, can_compute_live, requires_validation, output_dimension_eh} }: AtomicDimensionMethodInput) -> ExternResult<(Record, Record)> {
    // Check that input has a partial method
    if let Some(_entry_hash) = output_dimension_eh {
        return Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "no output dimension entry hash is needed - use the create_method endpoint instead."
        ))))
    }    
    // Check that input has an output dimension
    if !output_dimension.computed {
        return Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "to succeed in atomic operation, this endpoint requires an objective/output dimension as input."
        ))))
    }

    if let Ok(dimension_record) = create_dimension(output_dimension.clone()) {
        let dimension_eh = hash_entry(EntryTypes::Dimension(output_dimension.clone()))?;

        // Create method with the correct output dimension_eh
        if let Ok(method_record) = create_method(Method { 
            name, 
            input_dimension_ehs, 
            program,
            can_compute_live,
            requires_validation, 
            output_dimension_eh: dimension_eh, 
        }) {
            Ok((dimension_record, method_record))
        } else {
            Err(wasm_error!(WasmErrorInner::Guest(String::from(
                "not able to create method after creating output dimension: atomic operation failed."
            ))))
        }
    } else {
        Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "not able to create output dimension: atomic operation failed."
        ))))
    }
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AtomicDimensionMethodInput {
    output_dimension: Dimension,
    partial_method: PartialMethod,
}

#[hdk_extern]
pub fn get_dimensions(_: ()) -> ExternResult<Vec<Option<Record>>> {
    get_links(
        dimensions_typed_path()?.path_entry_hash()?,
        LinkTypes::Dimensions,
        None,
    )?
    .into_iter()
    .map(|link| get_dimension(link.target.into_entry_hash()
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from("Invalid link target"))))?
    ))
    .collect::<ExternResult<Vec<Option<Record>>>>()
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateDimensionInput {
    original_action_hash: ActionHash,
    updated_dimension: Dimension,
}

// Commented out per Damien's review
// https://github.com/neighbour-hoods/sensemaker-lite/issues/17

// #[hdk_extern]
// pub fn update_dimension(input: UpdateDimensionInput) -> ExternResult<ActionHash> {
//     update_entry(input.original_action_hash, &input.updated_dimension)
// }

// #[hdk_extern]
// pub fn delete_dimension(action_hash: ActionHash) -> ExternResult<ActionHash> {
//     delete_entry(action_hash)
// }

pub fn dimensions_typed_path() -> ExternResult<TypedPath> {
    Path::from("dimensions").typed(LinkTypes::Dimensions)
}
