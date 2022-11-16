use hdi::prelude::*;
mod assessment;
mod cultural_context;
mod dimension;
mod method;
mod range;
mod resource_type;

use assessment::Assessment;
use cultural_context::{CulturalContext, ContextResult, Threshold};
use dimension::Dimension;
use method::{Method, DataSet};
use resource_type::ResourceType;
pub use range::Range;

#[hdk_entry_defs]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    #[entry_def()]
    Range(Range),
    Assessment(Assessment),
    CulturalContext(CulturalContext),
    ContextResult(ContextResult),
    Threshold(Threshold),
    Dimension(Dimension),
    Method(Method),
    DataSet(DataSet),
    ResourceType(ResourceType),
}

#[hdk_extern]
pub fn validate(_op: Op) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
