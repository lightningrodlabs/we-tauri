use hdk::prelude::*;

use nh_sensemaker_zome_lib::*;
use nh_zome_sensemaker_widgets_integrity::*;

#[derive(Serialize, Deserialize, Debug, SerializedBytes, Clone)]
#[serde(rename_all = "camelCase")]
struct QueryParams {
    pub resource_def_eh: EntryHash,
}

#[hdk_extern]
fn get_widget_config(QueryParams { resource_def_eh }: QueryParams) -> ExternResult<Vec<DimensionBinding>> {
    let links = get_links(
        resource_def_eh,
        LinkTypes::WidgetConfigs,
        None,
    )?;

    Ok(links.iter()
        .filter_map(|link| {
            let maybe_record = get(
                EntryHash::from(link.clone().target),
                GetOptions::default(),
            );

            match maybe_record {
                Err(_) => None, // :TODO: error handling
                Ok(None) => None,
                Ok(Some(record)) =>
                    entry_from_record::<DimensionBinding>(record)
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
    pub widget_configs: Vec<DimensionBinding>,
}

#[hdk_extern]
fn set_widget_config(UpdateParams { resource_def_eh, widget_configs }: UpdateParams) -> ExternResult<bool> {
    // check existing configuration links
    let existing_links = get_links(
        resource_def_eh.to_owned(),
        LinkTypes::WidgetConfigs,
        None,
    )?;
    let link_targets: Vec<Option<EntryHash>> = existing_links.iter()
        .map(|l| l.target.to_owned().into_entry_hash())
        .collect();

    // process all passed configs
    let widget_config_hashes: Vec<EntryHash> = widget_configs.iter()
        .filter_map(|c| {
            let config_hash = hash_entry(c).ok();

            // ignore previously saved values
            if config_hash == None || link_targets.contains(&config_hash) {
                // return hash for comparing when removing stale configs
                return config_hash.to_owned()
            }

            // store new config blocks and link to Resource Def
            // :TODO: error handling
            create_entry(&EntryTypes::DimensionBinding(c.clone()));
            create_link(
                resource_def_eh.to_owned(),
                config_hash.clone().unwrap(),
                LinkTypes::WidgetConfigs,
                (),
            );

            config_hash
        })
        .collect();

    // unlink any existing configs which were not found in the input
    // :TODO: error handling
    existing_links.iter()
        .for_each(|l| {
            if widget_config_hashes.contains(&l.target.clone().into_entry_hash().unwrap()) {
                return
            }

            delete_link(l.create_link_hash.clone());
        });

    Ok(true)
}
