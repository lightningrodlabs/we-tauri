use hdi::prelude::*;
use crate::range::RangeKind;

#[hdk_entry_helper]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct AssessmentWidgetRegistration {
  pub applet_eh: EntryHash,
  pub widget_key: String,
  pub name: String,
  pub range_kind: RangeKind, // currently storing as nested which is not different from the input
  pub kind: String
}

impl TryFrom<AssessmentWidgetRegistrationInput> for AssessmentWidgetRegistration {
    // currently input is the same but leaving her in case implementation changes.
    type Error = WasmError;
    fn try_from(value: AssessmentWidgetRegistrationInput) -> Result<Self, Self::Error> {
        let registration = AssessmentWidgetRegistration {
            applet_eh: value.applet_eh,
            widget_key: value.widget_key,
            name: value.name,
            range_kind: value.range_kind,
            kind: value.kind,
        };
        Ok(registration)
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AssessmentWidgetRegistrationInput {
  pub applet_eh: EntryHash,
  pub widget_key: String,
  pub name: String,
  pub range_kind: RangeKind,
  pub kind: String
}
