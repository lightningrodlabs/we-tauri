use hdk::prelude::*;
use sensemaker_integrity_structs::{AssessmentWidgetRegistration, AssessmentWidgetRegistrationInput, Range};
use nh_zome_sensemaker_widgets_integrity::*;

#[hdk_extern]
fn register_assessment_widget(registration_input: AssessmentWidgetRegistrationInput) -> ExternResult<Record> {
    let action_hash;
    
        let input: AssessmentWidgetRegistration = registration_input.clone().try_into()?;
        // Create entry
        action_hash = create_entry(&EntryTypes::AssessmentWidgetRegistration(input.clone()))?;

        let eh = hash_entry(EntryTypes::AssessmentWidgetRegistration(input.clone()))?;
        // Create links
        // - applet entry hash to new entry hash // TODO: validate applet_eh
        create_link(
            registration_input.applet_eh.clone(),
            eh.clone(),
            LinkTypes::AppletToWidgetRegistration,
            (),
        )?;
        // - widget_registrations anchor to new entry hash
        create_link(
            registrations_typed_path()?.path_entry_hash()?,
            eh.clone(),
            LinkTypes::WidgetRegistrations,
            (),
        )?;

        let record = get(action_hash.clone(), GetOptions::default())?
            .ok_or(wasm_error!(WasmErrorInner::Guest("AssessmentWidgetRegistration could not be retrieved after creation".into())))?;

        // debug!("_+_+_+_+_+_+_+_+_+_ Created record: {:#?}", record);
        Ok(record)
}

#[hdk_extern]
fn get_assessment_widget_registration(assessment_widget_registration_eh: EntryHash) -> ExternResult<Option<Record>> {
    let maybe_registration = get(assessment_widget_registration_eh, GetOptions::default())?;

    if let Some(registration_record) = maybe_registration {
        Ok(Some(registration_record))
    } else {
        Ok(None)
    }
}

#[hdk_extern]
fn get_assessment_widget_registrations(_:()) -> ExternResult<Vec<Record>> {
    let links = get_links(
        registrations_typed_path()?.path_entry_hash()?,
        LinkTypes::WidgetRegistrations,
        None,
    )?;
    match links.last() {
        Some(_link) => {
            let collected_get_results: ExternResult<Vec<Option<Record>>> = links.into_iter().map(|link| {
                let entry_hash = link.target.into_entry_hash()
                    .ok_or_else(|| wasm_error!(WasmErrorInner::Guest(String::from("Invalid link target"))))?;
    
                get_assessment_widget_registration(entry_hash)
            }).collect();
    
            // Handle the Result and then filter_map to remove None values
            collected_get_results.map(|maybe_records| {
                maybe_records.into_iter().filter_map(|maybe_record| maybe_record).collect::<Vec<Record>>()
            })
        } 
        None => Ok(vec![])
    }
}

fn registrations_typed_path() -> ExternResult<TypedPath> {
    Path::from("widget_registrations").typed(LinkTypes::WidgetRegistrations)
}
