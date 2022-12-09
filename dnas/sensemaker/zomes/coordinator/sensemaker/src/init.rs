use hdk::prelude::*;
// use sensemaker_integrity::CulturalContext;
// use sensemaker_integrity::Method;
// use sensemaker_integrity::Properties;
// use sensemaker_integrity::ResourceType;

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
    // // let config = Properties::get()?.config;
    // let Some(config) = Properties::get()?.config else {
    //     return Ok(InitCallbackResult::Pass)
    // };
    // // check the format of the config passed from Wizard
    // config.check_format()?;

    // // create all entries specified in the config

    // // dimensions
    // let _dimension_ehs = config
    //     .dimensions
    //     .into_iter()
    //     .map(|dimension| create_entry(dimension))
    //     .collect::<ExternResult<Vec<ActionHash>>>()?;

    // // resource types
    // let _resource_type_ehs = config
    //     .resources
    //     .into_iter()
    //     .map(|resource| {
    //         let converted_resource_type = ResourceType::try_from(resource);
    //         create_entry(converted_resource_type)
    //     })
    //     .collect::<ExternResult<Vec<ActionHash>>>()?;

    // // methods
    // let _method_ehs = config
    //     .methods
    //     .into_iter()
    //     .map(|method| {
    //         let converted_method = Method::try_from(method);
    //         create_entry(converted_method)
    //     })
    //     .collect::<ExternResult<Vec<ActionHash>>>()?;

    // // contexts
    // let _context_ehs = config
    //     .contexts
    //     .into_iter()
    //     .map(|context| {
    //         let converted_context = CulturalContext::try_from(context);
    //         create_entry(converted_context)
    //     })
    //     .collect::<ExternResult<Vec<ActionHash>>>()?;

    Ok(InitCallbackResult::Pass)
}
