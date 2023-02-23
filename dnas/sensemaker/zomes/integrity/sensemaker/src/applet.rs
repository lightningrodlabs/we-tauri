use std::collections::BTreeMap;

use hdi::prelude::*;

use crate::{
    CulturalContext, Dimension, Method, OrderingKind, Program, Range, RangeValue, ResourceDef,
    ThresholdKind,
};

#[hdk_entry_helper]
#[derive(Clone)]
pub struct AppletConfig {
    pub name: String,
    pub ranges: BTreeMap<String, EntryHash>,
    pub dimensions: BTreeMap<String, EntryHash>,
    // the base_type field in ResourceDef needs to be bridged call
    pub resource_defs: BTreeMap<String, EntryHash>,
    pub methods: BTreeMap<String, EntryHash>,
    pub cultural_contexts: BTreeMap<String, EntryHash>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct AppletConfigInput {
    pub name: String,
    pub ranges: Vec<Range>,
    pub dimensions: Vec<ConfigDimension>,
    // the base_type field in ResourceDef needs to be bridged call
    pub resource_defs: Vec<ConfigResourceDef>,
    pub methods: Vec<ConfigMethod>,
    pub cultural_contexts: Vec<ConfigCulturalContext>,
}

impl AppletConfigInput {
    pub fn check_format(self) -> ExternResult<()> {
        // convert all ranges in config to EntryHashes
        let range_ehs = self
            .ranges
            .into_iter()
            .map(|range| hash_entry(range))
            .collect::<ExternResult<Vec<EntryHash>>>()?;

        // check if all dimensions are valid and convert to EntryHashes
        let dimension_ehs = self
            .dimensions
            .clone()
            .into_iter()
            .map(|dimension| dimension.check_format(range_ehs.clone()))
            .collect::<ExternResult<Vec<EntryHash>>>()?;

        // Mapping to detect errors. There may be better ways to handle this other than map
        let _check_result_resources: Vec<bool> = self
            .resource_defs
            .into_iter()
            .map(|resource| resource.check_format(dimension_ehs.clone()))
            .collect::<ExternResult<Vec<bool>>>()?;
        let _check_result_methods: Vec<bool> = self
            .methods
            .into_iter()
            .map(|method| method.check_format(dimension_ehs.clone()))
            .collect::<ExternResult<Vec<bool>>>()?;
        let _check_result_contexts: Vec<bool> = self
            .cultural_contexts
            .into_iter()
            .map(|context| context.check_format(dimension_ehs.clone()))
            .collect::<ExternResult<Vec<bool>>>()?;

        Ok(())
    }
}

#[derive(Clone, Serialize, Deserialize, Debug, SerializedBytes)]
pub struct ConfigDimension {
    pub name: String,
    pub range: Range,
    pub computed: bool,
}

impl ConfigDimension {
    pub fn check_format(self, range_ehs: Vec<EntryHash>) -> ExternResult<EntryHash> {
        let converted_dimension: Dimension = Dimension::try_from(self.clone())?;
        let dimension_range_eh = converted_dimension.clone().range;

        // check if range in dimension exists in the root ranges
        if let false = range_ehs.contains(&dimension_range_eh) {
            let error = format!(
                "dimension name {} has range not found in root ranges",
                self.name
            );
            return Err(wasm_error!(WasmErrorInner::Guest(error)));
        }
        Ok(hash_entry(converted_dimension)?)
    }
}

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct ConfigResourceDef {
    pub name: String,
    pub base_types: Vec<AppEntryDef>,
    pub dimensions: Vec<ConfigDimension>,
}

impl ConfigResourceDef {
    pub fn check_format(self, root_dimension_ehs: Vec<EntryHash>) -> ExternResult<bool> {
        let converted_resource: ResourceDef = ResourceDef::try_from(self.clone())?;
        let resources_dimension_ehs = converted_resource.dimension_ehs;

        // check if all dimensions in resource type exist in the root dimensions
        if let false = resources_dimension_ehs
            .to_owned()
            .into_iter()
            .all(|eh| root_dimension_ehs.contains(&eh))
        {
            let error = format!(
                "resource type name {} has one or more dimensions not found in root dimensions",
                self.name
            );
            return Err(wasm_error!(WasmErrorInner::Guest(error)));
        }
        Ok(true)
    }
}

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct ConfigMethod {
    pub name: String,
    pub target_resource_def: ConfigResourceDef,
    pub input_dimensions: Vec<ConfigDimension>, // check if it's subjective (for now)
    pub output_dimension: ConfigDimension,      // check if it's objective
    pub program: Program,                       // making enum for now, in design doc it is `AST`
    pub can_compute_live: bool,
    pub requires_validation: bool,
}

impl ConfigMethod {
    pub fn check_format(self, root_dimension_ehs: Vec<EntryHash>) -> ExternResult<bool> {
        let converted_method: Method = Method::try_from(self.clone())?;
        let input_dimension_ehs = converted_method.input_dimension_ehs;
        let output_dimension_eh = converted_method.output_dimension_eh;

        // check that the dimensions in input_dimensions are all subjective
        // NOTE: in the future, we might want to also allow objective dimensions in the input dimensions.
        if let false = self
            .input_dimensions
            .into_iter()
            .all(|dimension| dimension.computed == false)
        {
            let error = format!("method name {} has one or more input dimensions that are not a subjective dimension. All dimensions in input dimension must be subjective", self.name);
            return Err(wasm_error!(WasmErrorInner::Guest(error)));
        }

        // check that the dimension in output_dimension is objective
        if self.output_dimension.computed != true {
            let error = format!("method name {} has a subjective dimension defined in the output_dimension. output_dimension must be an objective dimension", self.name);
            return Err(wasm_error!(WasmErrorInner::Guest(error)));
        }

        // check if all dimensions in input dimensions exist in the root dimensions
        if let false = input_dimension_ehs
            .to_owned()
            .into_iter()
            .all(|eh| root_dimension_ehs.contains(&eh))
        {
            let error = format!(
                "method name {} has one or more input dimensions not found in root dimensions",
                self.name
            );
            return Err(wasm_error!(WasmErrorInner::Guest(error)));
        }
        // check if dimension in output dimensions exist in the root dimensions
        if let false = root_dimension_ehs.contains(&output_dimension_eh) {
            let error = format!(
                "method name {} has an output dimension not found in root dimensions",
                self.name
            );
            return Err(wasm_error!(WasmErrorInner::Guest(error)));
        }
        Ok(true)
    }
}

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct ConfigCulturalContext {
    pub name: String,
    pub resource_def: ConfigResourceDef,
    pub thresholds: Vec<ConfigThreshold>,
    pub order_by: Vec<(ConfigDimension, OrderingKind)>, // DimensionEh
}

impl ConfigCulturalContext {
    pub fn check_format(self, root_dimension_ehs: Vec<EntryHash>) -> ExternResult<bool> {
        let converted_cc: CulturalContext = CulturalContext::try_from(self.to_owned())?;

        // let dimension_ehs_in_resource = self
        //     .resource_def
        //     .dimensions
        //     .into_iter()
        //     .map(|dimension| hash_entry(dimension))
        //     .collect::<ExternResult<Vec<EntryHash>>>()?;

        let threholds_dimension_ehs = converted_cc
            .thresholds
            .into_iter()
            .map(|th| th.dimension_eh)
            .collect::<Vec<EntryHash>>();

        let order_by_dimension_ehs = converted_cc
            .order_by
            .into_iter()
            .map(|order| order.0)
            .collect::<Vec<EntryHash>>();

        // check that dimension in all thresholds exist in root dimensions
        if let false = threholds_dimension_ehs
            .into_iter()
            .all(|eh| root_dimension_ehs.contains(&eh))
        {
            let error = format!("cultural context name {} has one or more threhold with dimension not found in root dimensions", self.name);
            return Err(wasm_error!(WasmErrorInner::Guest(error)));
        }

        // check that Dimension in order by exist root dimensions
        if let false = order_by_dimension_ehs
            .into_iter()
            .all(|eh| root_dimension_ehs.contains(&eh))
        {
            let error = format!("cultural context name {} has one or more order_by with dimension not found in root dimensions", self.name);
            return Err(wasm_error!(WasmErrorInner::Guest(error)));
        }

        // check that Dimension in order_by is objective
        if let false = self.order_by.into_iter().all(|order_by| {
            return order_by.0.computed == true;
        }) {
            let error = format!("cultural context name {} has one or more dimensions that are not an objective dimension in the order_by field. All dimensions in order_by must be objective", self.name);
            return Err(wasm_error!(WasmErrorInner::Guest(error)));
        }

        Ok(true)
    }
}

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct ConfigThreshold {
    pub dimension: ConfigDimension,
    pub kind: ThresholdKind,
    pub value: RangeValue,
}
