use hdi::prelude::{
    holo_hash::{hash_type::Wasm, AgentPubKeyB64},
    *,
};

use crate::{
    CulturalContext, Dimension, Method, OrderingKind, Program, Range, RangeValue, ResourceType,
    Threshold, ThresholdKind,
};

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct Properties {
    pub community_activator: AgentPubKeyB64,
    pub config: SensemakerConfig,
}

impl Properties {
    pub fn get() -> ExternResult<Self> {
        let properties = dna_info()?.properties;
        debug!("properties, {:?}", properties);
        Ok(Properties::try_from(properties).map_err(|err| wasm_error!(err.to_string()))?)
    }
}

pub fn is_community_activator(author: AgentPubKey) -> ExternResult<bool> {
    let ca_key = Properties::get()?.community_activator;
    Ok(author == ca_key.into())
}

// TODO: decide whether we would want to save any of the information below to DHT for later edits
#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct SensemakerConfig {
    pub neighbourhood: String,
    pub wizard_version: String,
    pub config_version: String,
    pub creator: String,
    pub ranges: Vec<Range>,
    pub dimensions: Vec<Dimension>,
    // the base_type field in ResourceType needs to be bridged call
    pub resources: Vec<ConfigResourceType>,
    pub methods: Vec<ConfigMethod>,
    pub contexts: Vec<ConfigCulturalContext>,
}

impl SensemakerConfig {
    pub fn check_format(self) -> ExternResult<()> {
        // convert all dimensions in config to EntryHashes
        let dimension_ehs = self
            .dimensions
            .into_iter()
            .map(|dimension| hash_entry(dimension))
            .collect::<ExternResult<Vec<EntryHash>>>()?;

        let converted_resources: Vec<ResourceType> = self.resources.try_into()?;

        Ok(())
    }
}

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct ConfigResourceType {
    pub name: String,
    pub base_types: Vec<AppEntryType>,
    pub dimensions: Vec<Dimension>,
}

impl TryInto<ResourceType> for ConfigResourceType {
    type Error = WasmError;
    fn try_into(self) -> Result<ResourceType, Self::Error> {
        let dimension_ehs = self
            .dimensions
            .into_iter()
            .map(|dimension| hash_entry(dimension))
            .collect::<ExternResult<Vec<EntryHash>>>()?;
        let resource_type = ResourceType {
            name: self.name,
            base_types: self.base_types,
            dimension_ehs,
        };
        Ok(resource_type)
    }
}

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct ConfigMethod {
    pub name: String,
    pub target_resource_type: ConfigResourceType,
    pub input_dimensions: Vec<Dimension>, // check if it's subjective
    pub output_dimension: Dimension,      // check if it's objective
    pub program: Program,                 // making enum for now, in design doc it is `AST`
    pub can_compute_live: bool,
    pub must_publish_dataset: bool,
}

impl TryInto<Method> for ConfigMethod {
    type Error = WasmError;
    fn try_into(self) -> Result<Method, Self::Error> {
        let input_dimension_ehs = self
            .input_dimensions
            .into_iter()
            .map(|dimension| hash_entry(dimension))
            .collect::<ExternResult<Vec<EntryHash>>>()?;
        let output_dimension_eh = hash_entry(self.output_dimension)?;
        let resource: ResourceType = self.target_resource_type.try_into()?;
        let method = Method {
            name: self.name,
            target_resource_type_eh: hash_entry(resource)?,
            input_dimension_ehs,
            output_dimension_eh,
            program: self.program,
            can_compute_live: self.can_compute_live,
            must_publish_dataset: self.must_publish_dataset,
        };
        Ok(method)
    }
}

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct ConfigCulturalContext {
    pub name: String,
    pub resource_type: ConfigResourceType,
    pub thresholds: Vec<ConfigThreshold>,
    pub order_by: Vec<(Dimension, OrderingKind)>, // DimensionEh
}

impl TryInto<CulturalContext> for ConfigCulturalContext {
    type Error = WasmError;
    fn try_into(self) -> Result<CulturalContext, Self::Error> {
        let resource_type: ResourceType = self.resource_type.try_into()?;
        let thresholds: Vec<Threshold> = self
            .thresholds
            .into_iter()
            .map(|th| th.try_into())
            .collect::<ExternResult<Vec<Threshold>>>()?;
        let order_by = vec![];
        self.order_by.into_iter().for_each(|item| {
            if let Ok(dimension_eh) = hash_entry(item.0) {
                order_by.push((dimension_eh, item.1));
            } else {
                return error!("failed to convert dimension in config cc to entry hash");
            }
        });

        let cc = CulturalContext {
            name: self.name,
            resource_type_eh: hash_entry(resource_type)?,
            thresholds,
            order_by,
        };
        Ok(cc)
    }
}

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct ConfigThreshold {
    pub dimension: Dimension,
    pub kind: ThresholdKind,
    pub value: RangeValue,
}

impl TryInto<Threshold> for ConfigThreshold {
    type Error = WasmError;
    fn try_into(self) -> Result<Threshold, Self::Error> {
        let th = Threshold {
            dimension_eh: hash_entry(self.dimension)?,
            kind: self.kind,
            value: self.value,
        };
        Ok(th)
    }
}
