# Changelog
All notable changes to this project will be documented in this file.

## v0.0.6-alpha - 2023-04-18
- `@neighbourhoods/sensemaker-lite-types` renamed to `@neighbourhoods/client` and now includes the `SensemakerStore` class.
- renamed `get_assessments_for_resource` to `get_assessments_for_resources`, which now takes an array of resource hashes as well as dimension hashes and returns all the assessments along each dimension for all resources
- add `timestamp` property to `Assessment` struct
- `run_method` now returns the `Assessment` that was created from the method rather than the entry hash
- `run_method` can now compute averages for `Integer` using the `Program::Average` variant