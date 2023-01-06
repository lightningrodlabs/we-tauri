use std::collections::BTreeMap;

use hdk::prelude::*;
use sensemaker_integrity::{Dimension, ConfigResourceType, ConfigMethod, ConfigCulturalContext, AppletConfig, LinkTypes, EntryTypes, ResourceType, Method, CulturalContext};

use crate::{utils::entry_from_record, create_dimension, create_resource_type, create_method, create_cultural_context};

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct AppletConfigInput {
    pub name: String,
    // pub ranges: Vec<Range>, // leaving out ranges since this is not an entry and is just part of the dimension
    pub dimensions: Vec<Dimension>,
    // the base_type field in ResourceType needs to be bridged call
    pub resources: Vec<ConfigResourceType>,
    pub methods: Vec<ConfigMethod>,
    pub contexts: Vec<ConfigCulturalContext>,
}

#[hdk_extern]
pub fn register_applet(applet_config_input: AppletConfigInput) -> ExternResult<AppletConfig> {
    // check that it doesn't already exist
    let maybe_applet_config = check_if_applet_config_exists(applet_config_input.name.clone())?;
    if let Some(applet_config) = maybe_applet_config {
        // applet config already exists, return it
        Ok(applet_config)
    }
    else {
        // applet config doesn't exist, create it
        let mut dimensions: BTreeMap<String, EntryHash> = BTreeMap::new();
        for dimension in applet_config_input.dimensions {
            dimensions.insert(dimension.name.clone(), create_dimension(dimension)?);
        }
        let mut resources: BTreeMap<String, EntryHash> = BTreeMap::new();
        for config_resource_type in applet_config_input.resources {
            resources.insert(
                config_resource_type.name.clone(),
                create_resource_type(ResourceType::try_from(config_resource_type)?)?
            );
        }
        let mut methods: BTreeMap<String, EntryHash> = BTreeMap::new();
        for config_method in applet_config_input.methods {
            methods.insert(
                config_method.name.clone(),
                create_method(Method::try_from(config_method)?)?
            );
        }
        let mut contexts: BTreeMap<String, EntryHash> = BTreeMap::new();
        for config_context in applet_config_input.contexts {
            contexts.insert(
                config_context.name.clone(),
                create_cultural_context(CulturalContext::try_from(config_context)?)?
            );
        }
        let applet_config = AppletConfig {
            name: applet_config_input.name,
            dimensions,
            resources,
            methods,
            contexts,
        };
        create_entry(&EntryTypes::AppletConfig(applet_config.clone()))?;
        let applet_config_eh = hash_entry(&EntryTypes::AppletConfig(applet_config.clone()))?;
        create_link(
            applet_config_typed_path(applet_config.name.clone())?.path_entry_hash()?,
            applet_config_eh.clone(),
            LinkTypes::AppletConfig,
            (),
        )?;
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
        }
        else {
            Err(wasm_error!(WasmErrorInner::Guest(String::from(
                "unable to get applet config entry from entry hash"
            ))))
        }
    }
    else {
        // config doesn't exist
        Ok(None)
    }
}

fn applet_config_typed_path(applet_name: String) -> ExternResult<TypedPath> {
    Ok(Path::from(format!("all_applets.{}", applet_name))
    .typed(LinkTypes::AppletName)?)
}