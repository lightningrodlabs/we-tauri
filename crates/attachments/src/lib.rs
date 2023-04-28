use hc_zome_attachments_integrity::*;
use hdk::prelude::holo_hash::DnaHash;
use hdk::prelude::*;

#[derive(Serialize, Deserialize, Debug)]
pub struct Hrl {
    dna_hash: DnaHash,
    resource_hash: AnyDhtHash,
}

#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
pub struct HrlWithContext {
    hrl: Hrl,
    context: SerializedBytes,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AddAttachmentInput {
    hash: AnyDhtHash,
    hrl_with_context: HrlWithContext,
}

#[hdk_extern]
pub fn add_attachment(input: AddAttachmentInput) -> ExternResult<()> {
    create_link(
        input.hash,
        input.hrl_with_context.hrl.resource_hash.clone(),
        LinkTypes::Attachment,
        SerializedBytes::try_from(input.hrl_with_context)
            .map_err(|err| wasm_error!(err))?
            .bytes()
            .clone(),
    )?;

    Ok(())
}

#[hdk_extern]
pub fn get_attachments(hash: AnyDhtHash) -> ExternResult<Vec<HrlWithContext>> {
    let links = get_links(hash, LinkTypes::Attachment, None)?;

    let attachments = links
        .into_iter()
        .map(|link| HrlWithContext::try_from(SerializedBytes::from(UnsafeBytes::from(link.tag.0))))
        .collect::<Result<Vec<HrlWithContext>, SerializedBytesError>>()
        .map_err(|err| wasm_error!(err))?;

    Ok(attachments)
}
