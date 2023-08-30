# Changelog
All notable changes to this project will be documented in this file.

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