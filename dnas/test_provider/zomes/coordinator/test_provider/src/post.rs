use hdk::prelude::*;
use test_provider_integrity::EntryTypes;
use test_provider_integrity::Post;

#[hdk_extern]
pub fn get_resource(entry_hash: EntryHash) -> ExternResult<Option<Record>> {
    get(entry_hash, GetOptions::default())
}

#[hdk_extern]
pub fn get_post(entry_hash: EntryHash) -> ExternResult<Option<Record>> {
    get(entry_hash, GetOptions::default())
}

#[hdk_extern]
pub fn create_post(post: Post) -> ExternResult<EntryHash> {
    create_entry(&EntryTypes::Post(post.clone()))?;
    hash_entry(&EntryTypes::Post(post.clone()))
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdatePostInput {
    original_action_hash: ActionHash,
    updated_post: Post,
}

#[hdk_extern]
pub fn update_post(input: UpdatePostInput) -> ExternResult<ActionHash> {
    update_entry(input.original_action_hash, &input.updated_post)
}

#[hdk_extern]
pub fn delete_post(action_hash: ActionHash) -> ExternResult<ActionHash> {
    delete_entry(action_hash)
}
