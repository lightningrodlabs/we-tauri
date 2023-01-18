import { AgentPubKey, encodeHashToBase64, EntryHash, Record } from '@holochain/client';
import { SensemakerService } from './sensemakerService';
import { AppletConfig, AppletConfigInput, Assessment, ComputeContextInput, CreateAssessmentInput, CulturalContext, Dimension, GetAssessmentsForResourceInput, Method, ResourceType, RunMethodInput } from '@neighbourhoods/sensemaker-lite-types';
import { derived, get, Writable, writable } from 'svelte/store';
import { EntryHashMap } from '@holochain-open-dev/utils'
import { Option } from './sensemakerTypes';

interface ContextResults {
  [culturalContextName: string]: EntryHash[],
}
export class SensemakerStore {
  // store any value here that would benefit from being a store
  // like cultural context entry hash and then the context result vec

  #appletConfig: Writable<AppletConfig> = writable({ dimensions: {}, resource_types: {}, methods: {}, cultural_contexts: {}, name: "" });
  #contextResults: Writable<ContextResults> = writable({});

  // TODO: update the structure of this store to include dimension and resource type
  /*
  {
    [resourceEh: string]: Array<Assessment>
  }
  */
  #resourceAssessments: Writable<EntryHashMap<Array<Assessment>>> = writable(new EntryHashMap());

  /** Static info */
  public myAgentPubKey: AgentPubKey;

  constructor(
    protected service: SensemakerService,
  ) {
    this.myAgentPubKey = service.myPubKey();
  }

  resourceAssessments() {
    return derived(this.#resourceAssessments, resourceAssessments => resourceAssessments)
  }

  appletConfig() {
    return derived(this.#appletConfig, appletConfig => appletConfig)
  }

  contextResults() {
    return derived(this.#contextResults, contextResults => contextResults)
  }

  async createDimension(dimension: Dimension): Promise<EntryHash> {
    const dimensionEh = await this.service.createDimension(dimension);
    this.#appletConfig.update(appletConfig => {
      appletConfig.dimensions[dimension.name] = dimensionEh;
      return appletConfig;
    });
    return dimensionEh;
  }

  async createResourceType(resourceType: ResourceType): Promise<EntryHash> {
    const resourceTypeEh = await this.service.createResourceType(resourceType);
    this.#appletConfig.update(appletConfig => {
      appletConfig.resource_types[resourceType.name] = resourceTypeEh;
      return appletConfig;
    });
    return resourceTypeEh;
  }

  async createAssessment(assessment: CreateAssessmentInput): Promise<EntryHash> {
    const assessmentEh = await this.service.createAssessment(assessment);
    this.#resourceAssessments.update(resourceAssessments => {
      const maybePrevAssessments = resourceAssessments[encodeHashToBase64(assessment.subject_eh)];
      const prevAssessments = maybePrevAssessments ? maybePrevAssessments : [];
      resourceAssessments[encodeHashToBase64(assessment.subject_eh)] = [...prevAssessments, {...assessment, author: this.myAgentPubKey}]
      return resourceAssessments;
    })
    return assessmentEh;
  }

  async getAssessment(assessmentEh: EntryHash): Promise<Record> {
    return await this.service.getAssessment(assessmentEh) 
  }

  async getAssessmentForResource(getAssessmentsInput: GetAssessmentsForResourceInput): Promise<Array<Assessment>> {
    const resourceAssessments = await this.service.getAssessmentsForResource(getAssessmentsInput);
    this.#resourceAssessments.update(resourceAssessmentsPrev => {
      resourceAssessmentsPrev[encodeHashToBase64(getAssessmentsInput.resource_eh)] = resourceAssessments;
      return resourceAssessmentsPrev
    });
    return resourceAssessments;
  }
  
  async createMethod(method: Method): Promise<EntryHash> {
    const methodEh = await this.service.createMethod(method);
    this.#appletConfig.update(appletConfig => {
      appletConfig.methods[method.name] = methodEh;
      return appletConfig;
    });
    return methodEh;
  }

  async runMethod(runMethodInput: RunMethodInput): Promise<EntryHash> {
    return await this.service.runMethod(runMethodInput) 
  }

  async createCulturalContext(culturalContext: CulturalContext): Promise<EntryHash> {
    const contextEh = await this.service.createCulturalContext(culturalContext);
    this.#appletConfig.update(appletConfig => {
      appletConfig.cultural_contexts[culturalContext.name] = contextEh;
      return appletConfig;
    });
    return contextEh;
  }

  async getCulturalContext(culturalContextEh: EntryHash): Promise<Record> {
    return await this.service.getCulturalContext(culturalContextEh) 
  }

  async computeContext(contextName: string, computeContextInput: ComputeContextInput): Promise<Array<EntryHash>> {
    const contextResult = await this.service.computeContext(computeContextInput);
    this.#contextResults.update(contextResults => {
      contextResults[contextName] = contextResult;
      return contextResults;
    });
    return contextResult;
  }

  async checkIfAppletConfigExists(appletName: string): Promise<Option<AppletConfig>> {
    const maybeAppletConfig = await this.service.checkIfAppletConfigExists(appletName);
    if (maybeAppletConfig) {
      this.#appletConfig.update(() => maybeAppletConfig)
    }
    return maybeAppletConfig;
  }

  async registerApplet(appletConfigInput: AppletConfigInput): Promise<AppletConfig> {
    const appletConfig = await this.service.registerApplet(appletConfigInput);
    this.#appletConfig.update(() => appletConfig);
    return appletConfig;
  }
}
