use hdi::prelude::*;





#[hdk_entry_helper]
#[derive(Clone)]
pub struct Range {
  pub name: String,
  pub kind: String,
}