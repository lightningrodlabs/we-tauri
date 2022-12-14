use hdk::prelude::*;
use sensemaker_integrity::CulturalContext;
use sensemaker_integrity::Dimension;
use sensemaker_integrity::EntryTypes;
use sensemaker_integrity::LinkTypes;
use sensemaker_integrity::Method;
use sensemaker_integrity::Properties;
use sensemaker_integrity::ResourceType;
use sensemaker_integrity::SensemakerConfig;

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
    let prop = Properties::get()?;
    let my_key = agent_info()?.agent_latest_pubkey;
    if let false = Properties::is_community_activator(my_key)? {
        return Ok(InitCallbackResult::Pass);
    }
    if let Some(config) = prop.config {
        // check the format of the config passed from Wizard
        config.clone().check_format()?;

        // create all entries specified in the config

        // dimensions
        let _dimension_ehs = config
            .dimensions
            .clone()
            .into_iter()
            .map(|dimension: Dimension| create_entry(&EntryTypes::Dimension(dimension)))
            .collect::<ExternResult<Vec<ActionHash>>>()?;

        // resource types
        let _resource_type_ehs = config
            .resources
            .clone()
            .into_iter()
            .map(|resource| {
                let converted_resource_type = ResourceType::try_from(resource)?;
                create_entry(&EntryTypes::ResourceType(converted_resource_type))
            })
            .collect::<ExternResult<Vec<ActionHash>>>()?;

        // methods
        let _method_ehs = config
            .methods
            .clone()
            .into_iter()
            .map(|method| {
                let converted_method = Method::try_from(method)?;
                create_entry(&EntryTypes::Method(converted_method))
            })
            .collect::<ExternResult<Vec<ActionHash>>>()?;

        // contexts
        let _context_ehs = config
            .contexts
            .clone()
            .into_iter()
            .map(|context| {
                let converted_context = CulturalContext::try_from(context)?;
                create_entry(&EntryTypes::CulturalContext(converted_context))
            })
            .collect::<ExternResult<Vec<ActionHash>>>()?;

        // create the congif entry and link it off of the community activator

        let converted_config = SensemakerConfig::try_from(config)?;
        let community_activator_apk: AgentPubKey = prop.community_activator.into();
        create_entry(&EntryTypes::SensemakerConfig(converted_config.clone()))?;
        create_link(
            community_activator_apk,
            hash_entry(converted_config)?,
            LinkTypes::CAToSensemakerConfig,
            (),
        )?;
    } else {
        return Ok(InitCallbackResult::Pass);
    }
    return Ok(InitCallbackResult::Pass);
}
