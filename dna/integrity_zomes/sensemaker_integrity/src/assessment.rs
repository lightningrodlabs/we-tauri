use hdi::prelude::*;
use crate::range::RangeValue;
use crate::method::DataSet;

#[hdk_entry_helper]
#[derive(Clone)]
pub struct Assessment {
    pub value: RangeValue,
    pub dimension_eh: EntryHash,
    pub subject_eh: EntryHash,
    pub maybe_input_dataset: Option<DataSet>,
}