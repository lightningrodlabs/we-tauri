use hdk::prelude::*;
use nh_sensemaker_zome_lib::*;
use nh_zome_sensemaker_widgets_integrity::*;


#[derive(Serialize, Deserialize, Debug, SerializedBytes, Clone)]
#[serde(rename_all = "camelCase")]
struct QueryParams {
    pub resource_def_eh: EntryHash,
}

#[hdk_extern]
fn get_assessment_widget_tray_config(QueryParams { resource_def_eh }: QueryParams) -> ExternResult<Vec<AssessmentWidgetBlockConfig>> {
    let links = get_links(
        resource_def_eh,
        LinkTypes::WidgetConfigs,
        None,
    )?;

    Ok(links.iter()
        .filter_map(|link| {
            let maybe_record = get(
                link.target.clone().into_entry_hash()?,
                GetOptions::default(),
            );

            match maybe_record {
                Err(_) => None, // :TODO: error handling
                Ok(None) => None,
                Ok(Some(record)) =>
                    entry_from_record::<AssessmentWidgetBlockConfig>(record)
                        .map_or(None, |f| Some(f))
            }
        })
        .collect()
    )
}

#[derive(Serialize, Deserialize, Debug, SerializedBytes, Clone)]
#[serde(rename_all = "camelCase")]
struct UpdateParams {
    pub resource_def_eh: EntryHash,
    pub widget_configs: Vec<AssessmentWidgetBlockConfig>,
}

#[hdk_extern]
fn set_assessment_widget_tray_config(UpdateParams { resource_def_eh, widget_configs }: UpdateParams) -> ExternResult<Vec<EntryHash>> {
    // check existing configuration links
    let existing_links = get_links(
        resource_def_eh.to_owned(),
        LinkTypes::WidgetConfigs,
        None,
    )?;
    // find EntryHashes the links point to, and unlink them
    let _link_targets: Vec<Option<EntryHash>> = existing_links.iter()
        .map(|l| {
            // remove the link as a side-effect; this is a lazy way
            // of ensuring that link ordering is honoured upon updates
            let dr = delete_link(l.create_link_hash.clone());
            debug!("link deletion for block config {:?} returned {:?}", l.target, dr);

            l.target.to_owned().into_entry_hash()
        })
        .collect();

    // process & link all passed configs
    let widget_config_hashes = widget_configs.iter()
        .filter_map(|c| {
            let config_hash = hash_entry(c).ok();

            // ignore unhashable values; should never happen
            if config_hash == None {
                // return hash for comparing when removing stale configs
                return config_hash.to_owned()
            }

            // store new config blocks and link to Resource Def
            // :TODO: error handling
            let er = create_entry(&EntryTypes::AssessmentWidgetBlockConfig(c.clone()));
            debug!("entry creation for block config {:?} returned {:?}", config_hash, er);
            let lr = create_link(
                resource_def_eh.to_owned(),
                config_hash.clone().unwrap(),
                LinkTypes::WidgetConfigs,
                (),
            );
            debug!("link creation for block config {:?} returned {:?}", config_hash, lr);

            config_hash
        })
        .collect();

    Ok(widget_config_hashes)
}