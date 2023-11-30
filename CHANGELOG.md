# Changelog
All notable changes to this project will be documented in this file.

## v0.0.14-alpha - 2023-11-30
- `get_methods` and `get_methods_for_dimension` are added as zome functions. 
- `get_methods` takes no parameters, while `get_methods_for_dimension` accepts a `GetMethodsForDimensionInput` struct, having one `query: Option<QueryParams>` field. Calling with `query` as `null` returns the same as `get_methods`, but providing a `dimension_type` and `dimension_eh` will return all methods created with that input/output dimension entry hash.  
- All methods are now created with links to a `"methods"` anchor, plus a link from the input/output dimension entry hashes to the method entry hash - and tagged with the `dimension_type` ("input"/"output").
## v0.0.13-alpha - 2023-11-29
- `ResourceDef` fields have been updated: `name` is now `resource_name`, and the following three fields have been added to store where the resource entry is stored: `installed_app_id`, `role_name` and `zome_name`. 
- Because of this change to `ResourceDef`, the `resource_defs` field of `AppletConfig` no longer needs to be of type `HappZomeMap<BTreeMap<String, EntryHash>>` and is now just `BTreeMap<String, ResourceDef>`. In fact, `HappZomeMap` has been removed from the codebase. Additionally, the `resource_defs` field in `AppletConfigInput` has been reverted to `Vec<ConfigResourceDef>`.
- all `create_` zome functions that create an entry now return `Record` rather than `EntryHash`.
- `set_assessment_widget_tray_config` and `get_assessment_widget_tray_config` zome function for configuring the assessment widget tray defined in the new entry type `AssessmentWidgetBlockConfig`. These are used for binding a widget to a dimension so we know which widget to display when creating an assessment.
## v0.0.12-alpha - 2023-10-31
- `Method` and `ConfigMethod` no longer contains the `target_resource_def_eh` field.
- `RunMethodInput` now contains a `resource_def_eh` field.
## v0.0.11-alpha - 2023-08-30
- `get_assessments_for_resources` input type `GetAssessmentsForResourcesInput` now optionally takes a vector of resource hashes. If no resource hashes are provided, all assessments are fetched.
- `get_all_assessments` returns `ExternResult<Vec<Assessment>>` instead of `ExternResult<Vec<AssessmentWithDimensionAndResource>>`.
## v0.0.10-alpha - 2023-08-29
- `AppletConfig` type has been updated. Now the `resource_defs` field is of type `HappZomeMap<BTreeMap<String, EntryHash>>` instead of `BTreeMap<String, EntryHash>` so that the resource defs are mapped by the happ role name and zome name. The `role_name` field as removed as this information is now contained in the `resource_defs` field.
- new type `HappZomeMap<T>` created to represent the dnas (keyed by role name) and their zomes.
- `registerApplet` function takes an `AppletConfigInput` as a parameter instead of a `CreateAppletConfigInput`.
## v0.0.9-alpha - 2023-06-15
- context computations now support `Float` when checking against the threshold
## v0.0.8-alpha - 2023-06-13
- `dimension_ehs` property of `GetAssessmentsForResourceInput` changed from `DimensionEh[]` to `Option<DimensionEh[]>`. If nothing is provided, then all dimensions are used when calling `get_assessments_for_resources()`.
- Both `Sum` and `Average` method types now support `Float`.
## v0.0.7-alpha - 2023-05-09
- whenever an assessment is generated, the agent sends a remote signal to all other peers with a payload containing the newly generated assessment, which is then emitted to the client.
- new zome function `get_all_agents(_: ()) -> ExternResult<Vec<AgentPubKey>>` which returns a list of all other agents in the network.
## v0.0.6-alpha - 2023-04-18
- `@neighbourhoods/sensemaker-lite-types` renamed to `@neighbourhoods/client` and now includes the `SensemakerStore` class.
- renamed `get_assessments_for_resource` to `get_assessments_for_resources`, which now takes an array of resource hashes as well as dimension hashes and returns all the assessments along each dimension for all resources
- add `timestamp` property to `Assessment` struct
- `run_method` now returns the `Assessment` that was created from the method rather than the entry hash
- `run_method` can now compute averages for `Integer` using the `Program::Average` variant