use hdi::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, SerializedBytes)]
#[serde(rename_all = "camelCase")]
pub struct DimensionWidgetBinding {
    pub dimension_eh: EntryHash,
    // id of the widget CustomElement stored in companion zome
    pub widget_eh: EntryHash,
}

#[derive(Debug, Clone, Serialize, Deserialize, SerializedBytes)]
#[serde(rename_all = "camelCase")]
pub struct DimensionAppletFeatureBinding {
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
    StandaloneWidget(DimensionWidgetBinding),
    AppletWidget(DimensionAppletFeatureBinding),
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
