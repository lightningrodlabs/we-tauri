use hdi::prelude::*;
use crate::Range;

#[hdk_entry_helper]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct AssessmentWidgetRegistration {
  pub applet_eh: EntryHash,
  pub widget_key: String,
  pub name: String,
  pub range: Range, 
  pub kind: String
}

// impl TryFrom<AssessmentWidgetRegistrationInput> for AssessmentWidgetRegistration {
//     type Error = WasmError;
//     fn try_from(value: AssessmentWidgetRegistrationInput) -> Result<Self, Self::Error> {
//         let maybe_range: Option<Record> = get(value.range_eh, GetOptions::default())?;
//         let mut range = if let Some(record) = maybe_range {
//           Some(entry_from_record::<Record>(record)?)
//         } else {
//             Err(wasm_error!(WasmErrorInner::Guest(String::from(
//                 "unable to get range entry from entry hash"
//             ))))
//         };
//         range = range.map_or(None, |range| range);


//         let registration = AssessmentWidgetRegistration {
//             applet_eh: value.applet_eh,
//             widget_key: value.widget_key,
//             name: value.name,
//             range,
//             kind: value.kind,
//         };
//         Ok(registration)
//     }
// }

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AssessmentWidgetRegistrationInput {
  pub applet_eh: EntryHash,
  pub widget_key: String,
  pub name: String,
  pub range_eh: EntryHash, 
  pub kind: String
}