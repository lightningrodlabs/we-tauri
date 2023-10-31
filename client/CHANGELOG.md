# Changelog
All notable changes to the `@neighbourhoods/client` package will be documented in this file.

## v0.0.7 - 2023-10-31
- `createRange`, `getRange`, `getRanges`, `createDimension`, `getDimension`, `getDimensions`, `getResourceDef`, `getMethod` methods added to `SensemakerStore`.
- `RunMethodInput` (`runMethod`'s parameter type) now contains a `resource_def_eh` field.
## v0.0.6 - 2023-08-30
- SensemakerStore method `getAssessmentsForResources` input type changed so that both `resource_ehs` and `dimension_ehs` properties are optional. If no resource hashes are provided, all assessments are fetched.
## v0.0.5 - 2023-08-29
- `resource_defs` field of `AppletConfig` type changed to `HappZomeMap<{ [resourceDefName: string]: EntryHash }>`
- `registerApplet()` method on `SensemakerStore` takes an `AppletConfigInput` as a parameter instead of a `CreateAppletConfigInput`.
## v0.0.4 - 2023-07-24
- `appletConfig()` method renamed to `appletConfigs()` which now returns `{ [appletName: string]: AppletConfig }` instead of `AppletConfig`. This was done so that sensemaker primitives could be organized by applets that defined them.
- `flattenedAppletConfigs()` method added to return a flattened version of the applet configs, which can be used to replace any old references to `appletConfig()`.
- the following methods were removed:
    - `createDimension`
    - `createResourceDef`
    - `createMethod`
    - `createCulturalContext`
## v0.0.3 - 2023-06-13
- `appletUIConfig()` method removed.
- `widgetRegistry()` method added to store a mapping from a dimension eh to the display and assessment widgets.
- `activeMethod()` method added to store the currently active method for a given resource definition (this is how we currently make the association to know which widget to display).
- `methodDimensionMapping()` method added to store to map from a method eh to its input and output dimesion eh's.
- `myLatestAssessmentAlongDimension()` method added to return the latest assessment by the current agent along a dimension if it exists.
- `updateActiveMethod()` method added to update which method (and thus widget) to be associated with a given resource definition eh.
- `registerWidget()` method added to store the widget definition so that it can be accessed and rendered elsewhere.
- `dimension_ehs` property of `GetAssessmentsForResourceInput` changed from `DimensionEh[]` to `Option<DimensionEh[]>`. If nothing is provided, then all dimensions are used.
## v0.0.2 - 2023-05-09
- `SensemakerStore` constructor inputs changed from `Sensemaker(public service: SensemakerService)` to `constructor(public client: AppAgentClient, public roleName: RoleName, public zomeName = 'sensemaker')` so that the signal handler can be set up in the constructor.
- signal handler implemented so that whenever a signal of type `NewAssessment` is received, the assessment store is updated.
## v0.0.1 - 2023-04-18
- Initial release under new name
- Types and api methods updated to reflect [these changes](../CHANGELOG.md#v006-alpha---2023-04-18)
- addition of the [`AppletUIConfig`](./src/applet.ts) which is used to store the following for each resource def entry hash:
    - which objective dimension to display for the resource component
    - along which dimension will assessments be created for the resource
    - which method to run when creating the assessment
- two [util](./src/utils.ts) functions added: 
    - `getLargestAssessment`
    - `getLatestAssessment`