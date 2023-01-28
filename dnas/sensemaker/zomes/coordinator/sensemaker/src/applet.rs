use std::collections::BTreeMap;

use hdk::prelude::*;
use sensemaker_integrity::{
    AppletConfig, AppletConfigInput, CulturalContext, EntryTypes, LinkTypes, Method, ResourceType,
};

use crate::{
    create_cultural_context, create_dimension, create_method, create_resource_type,
    utils::entry_from_record,
};

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct CreateAppletConfigInput {
    pub applet_config_input: AppletConfigInput,
    pub role_name: String,
}

#[hdk_extern]
pub fn register_applet(CreateAppletConfigInput { applet_config_input, role_name }: CreateAppletConfigInput) -> ExternResult<AppletConfig> {
    // check the format of the applet config
    applet_config_input.clone().check_format()?;
    // check that it doesn't already exist
    let maybe_applet_config = check_if_applet_config_exists(applet_config_input.name.clone())?;
    if let Some(applet_config) = maybe_applet_config {
        // applet config already exists, return it
        Ok(applet_config)
    } else {
        // applet config doesn't exist, create it
        let (applet_config, _) = create_entries_from_applet_config(applet_config_input.clone(), Some(role_name))?;
        Ok(applet_config)
    }
}

#[hdk_extern]
pub fn check_if_applet_config_exists(applet_name: String) -> ExternResult<Option<AppletConfig>> {
    let links = get_links(
        applet_config_typed_path(applet_name)?.path_entry_hash()?,
        LinkTypes::AppletConfig,
        None,
    )?;
    let maybe_last_link = links.last();

    if let Some(link) = maybe_last_link {
        let maybe_record = get(EntryHash::from(link.clone().target), GetOptions::default())?;
        if let Some(record) = maybe_record {
            Ok(Some(entry_from_record::<AppletConfig>(record)?))
        } else {
            Err(wasm_error!(WasmErrorInner::Guest(String::from(
                "unable to get applet config entry from entry hash"
            ))))
        }
    } else {
        // config doesn't exist
        Ok(None)
    }
}

fn applet_config_typed_path(applet_name: String) -> ExternResult<TypedPath> {
    Ok(Path::from(format!("all_applets.{}", applet_name)).typed(LinkTypes::AppletName)?)
}

// create all entries specified in the config
pub fn create_entries_from_applet_config(
    config: AppletConfigInput,
    role_name: Option<String>,
) -> ExternResult<(AppletConfig, EntryHash)> {
    // dimensions
    let mut dimensions: BTreeMap<String, EntryHash> = BTreeMap::new();
    for dimension in config.dimensions {
        dimensions.insert(dimension.name.clone(), create_dimension(dimension)?);
    }
    let mut resource_types: BTreeMap<String, EntryHash> = BTreeMap::new();
    for config_resource_type in config.resource_types {
        resource_types.insert(
            config_resource_type.name.clone(),
            create_resource_type(ResourceType::try_from(config_resource_type)?)?,
        );
    }
    let mut methods: BTreeMap<String, EntryHash> = BTreeMap::new();
    for config_method in config.methods {
        methods.insert(
            config_method.name.clone(),
            create_method(Method::try_from(config_method)?)?,
        );
    }
    let mut cultural_contexts: BTreeMap<String, EntryHash> = BTreeMap::new();
    for config_context in config.cultural_contexts {
        cultural_contexts.insert(
            config_context.name.clone(),
            create_cultural_context(CulturalContext::try_from(config_context)?)?,
        );
    }

    let applet_config = AppletConfig {
        name: config.name,
        role_name,
        dimensions,
        resource_types: resource_types.clone(),
        methods,
        cultural_contexts,
    };
    create_entry(&EntryTypes::AppletConfig(applet_config.clone()))?;
    let applet_config_eh = hash_entry(&EntryTypes::AppletConfig(applet_config.clone()))?;
    let applet_config_path = applet_config_typed_path(applet_config.name.clone())?;
    // ensure path exists so we can fetch children of the "all_applets" root path component
    applet_config_path.ensure()?;
    create_link(
        applet_config_path.path_entry_hash()?,
        applet_config_eh.clone(),
        LinkTypes::AppletConfig,
        (),
    )?;
    // for each resource type entry hash, create a link
    resource_types.into_iter().map(|(_, resource_type_eh)| {
        create_link(
            EntryHash::from(resource_type_eh),
            applet_config_eh.clone(),
            LinkTypes::ResourceTypeEhToAppletConfig,
            (),
        )
    }).collect::<ExternResult<Vec<ActionHash>>>()?;
    Ok((applet_config, applet_config_eh))
}
