use hdk::prelude::*;
use nh_sensemaker_zome_lib::*;
use sensemaker_integrity_structs::{AssessmentWidgetRegistration, AssessmentWidgetRegistrationInput, Range};
use nh_zome_sensemaker_widgets_integrity::*;

#[hdk_extern]
fn register_assessment_widget(AssessmentWidgetRegistrationInput { applet_eh, widget_key, name, range_eh, kind }: AssessmentWidgetRegistrationInput) -> ExternResult<Record> {
    let action_hash;
    let maybe_range = get(range_eh, GetOptions::default())?;

    if let Some(range_record) = maybe_range {
        let range_entry : Range = entry_from_record(range_record)?;
        let input = AssessmentWidgetRegistration {
            applet_eh: applet_eh.clone(),
            widget_key: widget_key.clone(),
            kind: kind.clone(),
            name: name.clone(),
            range: range_entry.clone()
        };
        // Create entry
        action_hash = create_entry(&EntryTypes::AssessmentWidgetRegistration(input.clone()))?;

        let eh = hash_entry(EntryTypes::AssessmentWidgetRegistration(input.clone()))?;
        // Create links
        // - applet entry hash to new entry hash
        create_link(
            applet_eh.clone(),
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
    } else {
        // range doesn't exist
        Err(wasm_error!(WasmErrorInner::Guest("No range found for range_eh".into())))
    }
}

#[hdk_extern]
fn get_assessment_widget_registration(assessment_widget_registration_eh: EntryHash) -> ExternResult<AssessmentWidgetRegistration> {
    unimplemented!();
    // let links = get_links(
    //     resource_def_eh,
    //     LinkTypes::WidgetConfigs,
    //     None,
    // )?;

    // Ok(links.iter()
    //     .filter_map(|link| {
    //         let maybe_record = get(
    //             link.target.clone().into_entry_hash()?,
    //             GetOptions::default(),
    //         );

    //         match maybe_record {
    //             Err(_) => None, // :TODO: error handling
    //             Ok(None) => None,
    //             Ok(Some(record)) =>
    //                 entry_from_record::<AssessmentWidgetBlockConfig>(record)
    //                     .map_or(None, |f| Some(f))
    //         }
    //     })
    //     .collect()
    // )
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