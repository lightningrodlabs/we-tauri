# Sensemaker Store Object
## Constructor
`constructor(public client: AppAgentClient, public roleName: RoleName, public zomeName = 'sensemaker')`

## Properties
`myAgentPubKey`: The public key of the agent running the sensemaker-lite instance.

## Methods
`resourceAssessments(resource_ehs?: Array<EntryHashB64>): Readable<{ [entryHash: string]: Array<`[`Assessment`](../src/assessment.ts#L16-L19)`> }>`

Returns a Readable object of the resource assessments, optionally filtered by an array of resource entry hashes.

`appletConfig(): Readable<`[`AppletConfig`](../src/applet.ts#L8-L26)`>`

Returns a Readable object of the applet configuration.

`contextResults(): Readable<`[`ContextResults`](../src/culturalContext.ts#L21-L25)`>`

Returns a Readable object of the context results. Currently, whenever a context is computed, this store is updated with the new results, keyed by the context name.

`widgetRegistry(): Readable<`[`WidgetRegistry`](../src/applet.ts#L52-57)`>`

Returns a Readable object of the widget registry. This is a mapping from a dimension entry hash to the display and assessment widgets.

`activeMethod(): Readable<{
    [resourceDefEh: string]: EntryHashB64 // mapping from resourceDefEh to active methodEh
}>`

Returns a Readable object mapping a resource def eh to a method eh, to be able to know which widget is active for a given reesource def.

`methodDimensionMapping(): Readable<`[`MethodDimensionMapping`](../src/applet.ts#L59-64)`>`

Returns a Readable object of the method dimension mapping. This is a mapping from a method entry hash to its input and output dimension entry hashes.

`isAssessedByMeAlongDimension(resource_eh: EntryHashB64, dimension_eh: EntryHashB64)`

Returns a boolean indicating whether the current agent has assessed the given resource along the given dimension.

`myLatestAssessmentAlongDimension(resource_eh: EntryHashB64, dimension_eh: EntryHashB64): Readable<Assessment | null>`

Returns a Readable object of the latest assessment by the current agent along the given dimension for the given resource.

`getAllAgents()`

Returns an array of all the agents pub key that have registered themselves in the Neighbourhood.

`createDimension(dimension: `[`Dimension`](../src/dimension.ts#L8-L10)`): Promise<EntryHash>`

Creates a new dimension and returns its entry hash.

`createResourceDef(resourceDef: `[`ResourceDef`](../src/resourceDef.ts#L8-L10)`): Promise<EntryHash>`

Creates a new resource definition and returns its entry hash.

`createAssessment(assessment: `[`CreateAssessmentInput`](../src/assessment.ts#L8-L14)`): Promise<EntryHash>`

Creates a new assessment and returns its entry hash.

`getAssessment(assessmentEh: EntryHash): Promise<HolochainRecord>`

Retrieves the assessment record using its entry hash.

`getAssessmentsForResources(getAssessmentsInput: `[`GetAssessmentsForResourceInput`](../src/assessment.ts#L21-L24)`): Promise<Record<EntryHashB64, Array<`[`Assessment`](../src/assessment.ts#L16-L19)`>>>`

Retrieves all the assessments along the provided list of dimensions for the given list of resource entry hashes. Returns an object keyed by resource entry hash, with an array of assessments for each resource.

`createMethod(method: `[`Method`](../src/method.ts#L11-L15)`): Promise<EntryHash>`

Creates a new method and returns its entry hash.

`runMethod(runMethodInput: `[`RunMethodInput`](../src/method.ts#L23-L26)`): Promise<`[`Assessment`](../src/assessment.ts#L16-L19)`>`

Executes the specified method and returns the assessment that got created from the method.

`async createCulturalContext(culturalContext: `[`CulturalContext`](../src/culturalContext.ts#L9-L13)`): Promise<EntryHash>`

Creates a new cultural context and returns its entry hash.

`async getCulturalContext(culturalContextEh: EntryHash): Promise<HolochainRecord>`

Retrieves a cultural context from the sensemaker-lite.

`async computeContext(contextName: string, computeContextInput: `[`ComputeContextInput`](../src/culturalContext.ts#L27-L31)`): Promise<Array<EntryHash>>`

Computes a context result by taking a list of resource entry hashes and orders and filters them based on the cultural context.

`async checkIfAppletConfigExists(appletName: string): Promise<`[`Option`](../src/utils.ts#L4)`<`[`AppletConfig`](../src/applet.ts#L8-L26)`>>`

Checks if an applet configuration exists for the specified applet (by name) and returns the `AppletConfig` if it does, otherwise return `null`.

`async registerApplet(appletConfigInput: `[`CreateAppletConfigInput`](../src/applet.ts#L37-L40)`): Promise<`[`AppletConfig`](../src/applet.ts#L8-L26)`>`

Registers a new applet configuration in the sensemaker, but going through the config input and creating all the sensemaker primitive entries defined in it.

`async updateAppletUIConfig(resourceDefEh: EntryHashB64, currentObjectiveDimensionEh: EntryHash, currentCreateAssessmentDimensionEh: EntryHash, currentMethodEh: EntryHash)`

Updates the UI configuration for a resource definition so that the UI can know which dimensions to render for a given resource.

# util functions
`getLargestAssessment(assessments: Assessment[], dimension_eh: EntryHashB64): Option<Assessment>`

Given a list of assessments and a dimension eh, returns the largest assessment for that dimension, if it exists.

`getLatestAssessment(assessments: Assessment[], dimension_eh: EntryHashB64): Option<Assessment>`

Given a list of assessments and a dimension eh, returns the latest assessment for that dimension, if it exists.

