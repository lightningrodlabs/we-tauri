use crate::dimension::RangeValue;
use crate::method::DataSet;
use hdi::prelude::*;

#[hdk_entry_helper]
#[derive(Clone)]
pub struct Assessment {
    pub value: RangeValue,
    pub dimension_eh: EntryHash,
    pub resource_eh: EntryHash,
    pub resource_type_eh: EntryHash,
    pub maybe_input_dataset: Option<DataSet>,
    pub author: AgentPubKey,
}
