use hdi::prelude::*;

use crate::{
    applet::{ConfigCulturalContext, ConfigThreshold},
    range::RangeValue,
    Dimension, ResourceDef,
};

#[hdk_entry_helper]
#[derive(Clone)]
pub struct CulturalContext {
    pub name: String,
    pub resource_def_eh: EntryHash,
    pub thresholds: Vec<Threshold>,
    pub order_by: Vec<(EntryHash, OrderingKind)>, // DimensionEh
}

impl TryFrom<ConfigCulturalContext> for CulturalContext {
    type Error = WasmError;
    fn try_from(value: ConfigCulturalContext) -> Result<Self, Self::Error> {
        let resource_def: ResourceDef = value.resource_def.try_into()?;
        let thresholds: Vec<Threshold> = value
            .thresholds
            .into_iter()
            .map(|th| Threshold::try_from(th))
            .collect::<ExternResult<Vec<Threshold>>>()?;
        let mut order_by = vec![];
        value.order_by.into_iter().for_each(|item| {
            if let Ok(converted_dimension) = Dimension::try_from(item.0) {
                if let Ok(dimension_eh) = hash_entry(converted_dimension) {
                    order_by.push((dimension_eh, item.1));
                } else {
                    return error!(
                        "failed to convert dimension found in cultural context to entry hash"
                    );
                }
            } else {
                return error!(
                    "failed to convert config dimension found in cultural context to dimension"
                );
            }
        });

        let cc = CulturalContext {
            name: value.name,
            resource_def_eh: hash_entry(resource_def)?,
            thresholds,
            order_by,
        };
        Ok(cc)
    }
}

#[hdk_entry_helper]
#[derive(Clone)]
pub struct ContextResult {
    pub context_eh: EntryHash,
    pub dimension_ehs: Vec<EntryHash>, // of objective dimensions
    pub result: Vec<(EntryHash, Vec<RangeValue>)>,
}

#[hdk_entry_helper]
#[derive(Clone)]
pub struct Threshold {
    pub dimension_eh: EntryHash,
    pub kind: ThresholdKind,
    pub value: RangeValue,
}

impl TryFrom<ConfigThreshold> for Threshold {
    type Error = WasmError;
    fn try_from(value: ConfigThreshold) -> Result<Threshold, Self::Error> {
        let th = Threshold {
            dimension_eh: hash_entry(Dimension::try_from(value.dimension)?)?,
            kind: value.kind,
            value: value.value,
        };
        Ok(th)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum OrderingKind {
    Biggest,
    Smallest,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ThresholdKind {
    GreaterThan,
    LessThan,
    Equal,
}
