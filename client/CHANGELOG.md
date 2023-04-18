# Changelog
All notable changes to the `@neighbourhoods/client` package will be documented in this file.

## v0.0.1 - 2023-04-17
- Initial release under new name
- Types and api methods updated to reflect [these changes](../CHANGELOG.md#v006-alpha---2023-04-18)
- addition of the [`AppletUIConfig`](./src/applet.ts) which is used to store the following for each resource def entry hash:
    - which objective dimension to display for the resource component
    - along which dimension will assessments be created for the resource
    - which method to run when creating the assessment
- two [util](./src/utils.ts) functions added: 
    - `getLargestAssessment`
    - `getLatestAssessment`