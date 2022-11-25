use hdi::prelude::*;

#[hdk_entry_helper]
#[derive(Clone)]
pub struct Post {
    pub title: String,
    pub content: String,
}
