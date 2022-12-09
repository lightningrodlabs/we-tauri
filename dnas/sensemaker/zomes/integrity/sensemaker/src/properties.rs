use hdi::prelude::{
    holo_hash::{hash_type::Wasm, AgentPubKeyB64},
    *,
};

use crate::{
    CulturalContext, Dimension, Method, OrderingKind, Program, Range, RangeValue, ResourceType,
    Threshold, ThresholdKind, dimension,
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

        // Using a map to detect the errors. There may be better ways to handle this other than map
        let _check_result_resources: Vec<bool> = self.resources.into_iter().map(|resource| resource.check_format(dimension_ehs.clone())).collect::<ExternResult<Vec<bool>>>()?;
        let _check_result_methods: Vec<bool> = self.methods.into_iter().map(|method| method.check_format(dimension_ehs.clone())).collect::<ExternResult<Vec<bool>>>()?;
        let _check_result_contexts: Vec<bool> = self.contexts.into_iter().map(|context| context.check_format(dimension_ehs.clone())).collect::<ExternResult<Vec<bool>>>()?;
        
        Ok(())
    }
}

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct ConfigResourceType {
    pub name: String,
    pub base_types: Vec<(DnaHash, AppEntryType)>,
    pub dimensions: Vec<Dimension>,
}

impl ConfigResourceType {
    pub fn check_format(self, dimension_ehs: Vec<EntryHash>) -> ExternResult<bool> {
        let converted_resource: ResourceType = ResourceType::try_from(self.clone())?;
        let resources_dimension_ehs = converted_resource.dimension_ehs;
        
        // check if all dimensions in resource type exist in the root dimensions
        if let false = resources_dimension_ehs.to_owned().into_iter().all(|eh| dimension_ehs.contains(&eh)) {
            let error = format!("resource type name {} has one or more dimensions not found in root dimensions", self.name);
            return Err(wasm_error!(WasmErrorInner::Guest(error)))
        }
        Ok(true)
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

impl ConfigMethod {
    pub fn check_format(self, dimension_ehs: Vec<EntryHash>) -> ExternResult<bool> {
        let converted_method: Method = Method::try_from(self.clone())?;
        let input_dimension_ehs = converted_method.input_dimension_ehs;
        let output_dimension_eh = converted_method.output_dimension_eh;

        // check that the dimensions in input_dimensions are all subjective
        if let false = self.input_dimensions.into_iter().all(|dimension| dimension.comptued == false) {
            let error = format!("method name {} has one or more input dimensions that are not a subjective dimension. All dimensions in input dimension must be subjective", self.name);
            return Err(wasm_error!(WasmErrorInner::Guest(error)))
        }

        // check that the dimension in output_dimension is objective
        if self.output_dimension.comptued == false {
            let error = format!("method name {} has a subjective dimension defined in the output_dimension. output_dimension must be an objective dimension", self.name);
            return Err(wasm_error!(WasmErrorInner::Guest(error)))
        }
        
        // check if all dimensions in input dimensions exist in the root dimensions
        if let false = input_dimension_ehs.to_owned().into_iter().all(|eh| dimension_ehs.contains(&eh)) {
            let error = format!("method name {} has one or more input dimensions not found in root dimensions", self.name);
            return Err(wasm_error!(WasmErrorInner::Guest(error)))
        }
        // check if dimension in output dimensions exist in the root dimensions
        if let false = dimension_ehs.contains(&output_dimension_eh) {
            let error = format!("method name {} has an output dimension not found in root dimensions", self.name);
            return Err(wasm_error!(WasmErrorInner::Guest(error)))
        }
        Ok(true)
    }
}

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct ConfigCulturalContext {
    pub name: String,
    pub resource_type: ConfigResourceType,
    pub thresholds: Vec<ConfigThreshold>,
    pub order_by: Vec<(Dimension, OrderingKind)>, // DimensionEh
}

impl ConfigCulturalContext {
    pub fn check_format(self, dimension_ehs: Vec<EntryHash>) -> ExternResult<bool> {
        let converted_cc: CulturalContext = CulturalContext::try_from(self.to_owned())?;
        let threholds_dimension_ehs = converted_cc.thresholds.into_iter().map(|th| th.dimension_eh).collect::<Vec<EntryHash>>();
        let order_by_dimension_ehs = converted_cc.order_by.into_iter().map(|order| order.0).collect::<Vec<EntryHash>>(); 
        
        // check if dimension in all threholds exist in root dimensions
        if let false = threholds_dimension_ehs.into_iter().all(|eh| dimension_ehs.contains(&eh)) {
            let error = format!("cultural context name {} has one or more threhold with dimension not found in root dimensions", self.name);
            return Err(wasm_error!(WasmErrorInner::Guest(error)))
        }

        // check if Dimension in order by exist in root dimensions
        if let false = order_by_dimension_ehs.into_iter().all(|eh| dimension_ehs.contains(&eh)) {
            let error = format!("cultural context name {} has one or more order_by with dimension not found in root dimensions", self.name);
            return Err(wasm_error!(WasmErrorInner::Guest(error)))
        }

        Ok(true)
    }
}


#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct ConfigThreshold {
    pub dimension: Dimension,
    pub kind: ThresholdKind,
    pub value: RangeValue,
}