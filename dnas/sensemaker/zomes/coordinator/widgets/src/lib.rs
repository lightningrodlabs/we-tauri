use hdk::prelude::*;

use nh_sensemaker_zome_lib::*;
use nh_zome_sensemaker_widgets_integrity::*;

#[derive(Serialize, Deserialize, Debug, SerializedBytes, Clone)]
#[serde(rename_all = "camelCase")]
struct QueryParams {
    pub resource_def_eh: EntryHash,
}

#[hdk_extern]
fn get_assessment_widget_tray_config(QueryParams { resource_def_eh }: QueryParams) -> ExternResult<AssessmentWidgetBlockConfig> {
    let links = get_links(
        resource_def_eh,
        LinkTypes::WidgetConfigs,
        None,
    )?;

    let link = links.first()
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "unable to locate widget configuration for Resource Def"
        ))))?;

    let maybe_record = get(
        EntryHash::from(link.clone().target),
        GetOptions::default(),
    );

    match maybe_record {
        Err(e) => Err(WasmError::from(e)),
        Ok(None) => Err(wasm_error!(WasmErrorInner::Guest(String::from(
                "unable to load widget configuration for Resource Def"
            )))),
        Ok(Some(record)) =>
            entry_from_record::<AssessmentWidgetBlockConfig>(record)
                .map_or(Err(wasm_error!(WasmErrorInner::Guest(String::from(
                    "unable to decode widget configuration for Resource Def"
                )))), |f| Ok(f))
    }
}

#[derive(Serialize, Deserialize, Debug, SerializedBytes, Clone)]
#[serde(rename_all = "camelCase")]
struct UpdateParams {
    pub resource_def_eh: EntryHash,
    pub widget_config: AssessmentWidgetBlockConfig,
}

#[hdk_extern]
fn set_assessment_widget_tray_config(UpdateParams { resource_def_eh, widget_config }: UpdateParams) -> ExternResult<EntryHash> {
    // check existing configuration links
    let existing_links = get_links(
        resource_def_eh.to_owned(),
        LinkTypes::WidgetConfigs,
        None,
    )?;
    let link_targets: Vec<Option<EntryHash>> = existing_links.iter()
        .map(|l| l.target.to_owned().into_entry_hash())
        .collect();

    // process newly passed config
    let config_hash = hash_entry(widget_config.to_owned()).ok();

    // ignore previously saved values
    if config_hash == None || link_targets.contains(&config_hash) {
        // return hash of stored widget configuration data
        return config_hash.ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "unable to determine widget config entry hash"
        ))))
    }

    // store new config block and link to Resource Def
    // :TODO: error handling
    create_entry(&EntryTypes::AssessmentWidgetBlockConfig(widget_config))?;
    create_link(
        resource_def_eh.to_owned(),
        config_hash.clone().unwrap(),
        LinkTypes::WidgetConfigs,
        (),
    )?;

    // unlink any existing configs which were not found in the input
    // :TODO: error handling
    existing_links.iter()
        .for_each(|l| {
            if l.target.to_owned().into_entry_hash() == config_hash {
                return
            }

            delete_link(l.create_link_hash.clone());
        });

    Ok(config_hash.unwrap())
}
