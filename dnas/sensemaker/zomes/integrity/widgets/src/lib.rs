use hdi::prelude::*;
use sensemaker_integrity_structs::Properties;

#[derive(Debug, Clone, Serialize, Deserialize, SerializedBytes)]
#[serde(rename_all = "camelCase")]
pub struct DimensionStandaloneWidgetBinding {
    pub dimension_eh: EntryHash,
    // id of the widget CustomElement stored in companion zome
    pub widget_eh: EntryHash,
}

#[derive(Debug, Clone, Serialize, Deserialize, SerializedBytes)]
#[serde(rename_all = "camelCase")]
pub struct DimensionAppletWidgetBinding {
    pub dimension_eh: EntryHash,
    // id of the AppletConfig stored in companion zome
    pub applet_id: EntryHash,
    // name of the component as exposed by the applet interface
    pub component_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, SerializedBytes)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum DimensionBinding {
    // For when components are separated out into their own DHT entry
    // (or sequence of DHT entries to allow extra large codebases to be stored).
    StandaloneWidget(DimensionStandaloneWidgetBinding),
    AppletWidget(DimensionAppletWidgetBinding),
}

#[hdk_entry_helper]
#[serde(rename_all = "camelCase")]
#[derive(Clone)]
pub struct AssessmentWidgetBlockConfig {
    input_assessment_widget: DimensionBinding,
    output_assessment_widget: DimensionBinding,
}

#[hdk_entry_defs]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    #[entry_def()]
    AssessmentWidgetBlockConfig(AssessmentWidgetBlockConfig),
}

#[hdk_link_types]
pub enum LinkTypes {
    WidgetConfigs
}

// :DUPE: ca_validation_callback
#[hdk_extern]
pub fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
    return match op {
        Op::StoreEntry(entry) => match entry.action.hashed.clone().into_content() {
            EntryCreationAction::Create(create) => validate_author_as_ca(
                OpTypes::StoreEntry(entry).clone(),
                EntryCreationAction::Create(create).entry_type().clone(),
            ),
            EntryCreationAction::Update(update) => validate_author_as_ca(
                OpTypes::StoreEntry(entry),
                EntryCreationAction::Update(update).entry_type().clone(),
            ),
        },
        Op::StoreRecord(record) => {
            match record.record.signed_action.hashed.clone().into_content() {
                Action::Create(create) => validate_author_as_ca(
                    OpTypes::StoreRecord(record).clone(),
                    EntryCreationAction::Create(create).entry_type().clone(),
                ),
                Action::Update(update) => validate_author_as_ca(
                    OpTypes::StoreRecord(record),
                    EntryCreationAction::Update(update).entry_type().clone(),
                ),
                _ => Ok(ValidateCallbackResult::Valid),
            }
        }
        Op::RegisterUpdate(update) => validate_author_as_ca(
            OpTypes::RegisterUpdate(update.clone()),
            update.update.hashed.entry_type.clone(),
        ),
        Op::RegisterDelete(delete) => {
            let ah = delete.delete.hashed.deletes_address.clone();
            let action = must_get_action(ah)?;
            if let Some(entry_type) = action.hashed.entry_type() {
                validate_author_as_ca(OpTypes::RegisterDelete(delete.clone()), entry_type.clone())
            } else {
                Ok(ValidateCallbackResult::Invalid(String::from(
                    "the delete address does not contain an entry type",
                )))
            }
        }
        Op::RegisterAgentActivity(activity) => {
            match activity.action.hashed.clone().into_content() {
                Action::Create(create) => validate_author_as_ca(
                    OpTypes::RegisterAgentActivity(activity).clone(),
                    EntryCreationAction::Create(create).entry_type().clone(),
                ),
                Action::Update(update) => validate_author_as_ca(
                    OpTypes::RegisterAgentActivity(activity),
                    EntryCreationAction::Update(update).entry_type().clone(),
                ),
                _ => Ok(ValidateCallbackResult::Valid),
            }
        }
        Op::RegisterCreateLink { .. } => Ok(ValidateCallbackResult::Valid),
        Op::RegisterDeleteLink { .. } => Ok(ValidateCallbackResult::Valid),
    };
}

#[derive(Clone)]
enum OpTypes {
    StoreEntry(StoreEntry),
    StoreRecord(StoreRecord),
    RegisterUpdate(RegisterUpdate),
    RegisterDelete(RegisterDelete),
    RegisterAgentActivity(RegisterAgentActivity),
}

// :DUPE: validate_author_as_ca
fn validate_author_as_ca(
    op_types: OpTypes,
    entry_type: EntryType,
) -> ExternResult<ValidateCallbackResult> {
    return match entry_type {
        EntryType::App(app_entry_def) => {
            return match app_entry_def.entry_index {
                // AssessmentWidgetBlockConfig
                EntryDefIndex(0) => {
                    let author = match op_types {
                        OpTypes::StoreEntry(entry) => entry.clone().action.hashed.author().clone(),
                        OpTypes::StoreRecord(record) => {
                            record.record.signed_action.hashed.author().clone()
                        }
                        OpTypes::RegisterUpdate(update) => update.update.hashed.author.clone(),
                        OpTypes::RegisterDelete(delete) => delete.delete.hashed.author.clone(),
                        OpTypes::RegisterAgentActivity(activity) => {
                            activity.action.hashed.author().clone()
                        }
                    };
                    if let true = Properties::is_community_activator(author)? {
                        Ok(ValidateCallbackResult::Valid)
                    } else {
                        Ok(ValidateCallbackResult::Invalid(String::from(
                            "only the community activator can create this entry",
                        )))
                    }
                }
                _ => Ok(ValidateCallbackResult::Valid),
            };
        }
        _ => Ok(ValidateCallbackResult::Valid),
    };
}
