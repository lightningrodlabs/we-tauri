# Sensemaker Store Object
## Properties
`myAgentPubKey`: The public key of the agent running the sensemaker-lite instance.

## Methods
`resourceAssessments(resource_ehs?: Array<EntryHashB64>): Readable<{ [entryHash: string]: Array<`[`Assessment`](../src/assessment.ts#L16-L19)`> }>`

Returns a Readable object of the resource assessments, optionally filtered by an array of resource entry hashes.

`appletConfig(): Readable<`[`AppletConfig`](../src/applet.ts#L8-L26)`>`

Returns a Readable object of the applet configuration.

`contextResults(): Readable<`[`ContextResults`](../src/culturalContext.ts#L21-L25)`>`

Returns a Readable object of the context results. Currently, whenever a context is computed, this store is updated with the new results, keyed by the context name.

`appletUIConfig(): Readable<`[`AppletUIConfig`](../src/applet.ts#L42-L48)`>`

Returns a Readable object of the applet UI configuration, which is currently used to know which dimensions/assessments to render for a given resource hash within an applet.

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