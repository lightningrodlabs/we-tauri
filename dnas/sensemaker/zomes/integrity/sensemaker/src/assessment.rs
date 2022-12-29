use crate::dimension::RangeValue;
use crate::method::DataSet;
use hdi::prelude::*;

#[hdk_entry_helper]
#[derive(Clone)]
pub struct Assessment {
    pub value: RangeValue,
    pub dimension_eh: EntryHash,
    pub subject_eh: EntryHash, // assuming this is the EH of the resource being assessed
    pub maybe_input_dataset: Option<DataSet>,
    pub author: AgentPubKey,
}
