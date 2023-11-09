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
                Err(_) => None,
                Ok(None) => None,
                Ok(Some(record)) =>
                    entry_from_record::<DimensionBinding>(record)
                        .map_or(None, |f| Some(f))
            }
        })
        .collect()
    )
}
