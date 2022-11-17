use hdi::prelude::*;
mod assessment;
mod cultural_context;
mod dimension;
mod method;
mod resource_type;

pub use assessment::Assessment;
pub use cultural_context::{CulturalContext, ContextResult, Threshold};
pub use dimension::Dimension;
pub use method::{Method, DataSet};
pub use resource_type::ResourceType;

#[hdk_entry_defs]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    #[entry_def()]
    Assessment(Assessment),
    CulturalContext(CulturalContext),
    ContextResult(ContextResult),
    Threshold(Threshold),
    Dimension(Dimension),
    Method(Method),
    DataSet(DataSet),
    ResourceType(ResourceType),
}

#[hdk_link_types]
pub enum LinkTypes {
    Dimensions,
    Assessment,
}

#[hdk_extern]
pub fn validate(_op: Op) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
