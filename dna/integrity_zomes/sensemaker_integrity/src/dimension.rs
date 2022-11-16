use crate::Range;
use hdi::prelude::*;

#[hdk_entry_helper]
#[derive(Clone)]
pub struct Dimension {
    pub name: String,
    pub range: Range,
}
