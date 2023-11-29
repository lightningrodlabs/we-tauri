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

// #[hdk_extern]
// fn update_assessment_widget_registration(UpdateParams { resource_def_eh, widget_configs }: UpdateParams) -> ExternResult<Vec<EntryHash>> {
//     // check existing configuration links
//     let existing_links = get_links(
//         resource_def_eh.to_owned(),
//         LinkTypes::WidgetConfigs,
//         None,
//     )?;
//     // find EntryHashes the links point to, and unlink them
//     let _link_targets: Vec<Option<EntryHash>> = existing_links.iter()
//         .map(|l| {
//             // remove the link as a side-effect; this is a lazy way
//             // of ensuring that link ordering is honoured upon updates
//             let dr = delete_link(l.create_link_hash.clone());
//             debug!("link deletion for block config {:?} returned {:?}", l.target, dr);

//             l.target.to_owned().into_entry_hash()
//         })
//         .collect();

//     // process & link all passed configs
//     let widget_config_hashes = widget_configs.iter()
//         .filter_map(|c| {
//             let config_hash = hash_entry(c).ok();

//             // ignore unhashable values; should never happen
//             if config_hash == None {
//                 // return hash for comparing when removing stale configs
//                 return config_hash.to_owned()
//             }

//             // store new config blocks and link to Resource Def
//             // :TODO: error handling
//             let er = create_entry(&EntryTypes::AssessmentWidgetBlockConfig(c.clone()));
//             debug!("entry creation for block config {:?} returned {:?}", config_hash, er);
//             let lr = create_link(
//                 resource_def_eh.to_owned(),
//                 config_hash.clone().unwrap(),
//                 LinkTypes::WidgetConfigs,
//                 (),
//             );
//             debug!("link creation for block config {:?} returned {:?}", config_hash, lr);

//             config_hash
//         })
//         .collect();

//     Ok(widget_config_hashes)
// }