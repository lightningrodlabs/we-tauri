import { AgentPubKey, encodeHashToBase64, EntryHash, EntryHashB64, Record as HolochainRecord } from '@holochain/client';
import { SensemakerService } from './sensemakerService';
import { AppletConfig, AppletConfigInput, Assessment, ComputeContextInput, CreateAssessmentInput, CulturalContext, Dimension, DimensionEh, GetAssessmentsForResourceInput, Method, ResourceDef, ResourceDefEh, ResourceEh, RunMethodInput } from './index';
import { derived, get, Writable, writable } from 'svelte/store';
import { EntryHashMap } from '@holochain-open-dev/utils'
import { Option } from './utils';

interface ContextResults {
  [culturalContextName: string]: EntryHash[],
}
export class SensemakerStore {
  // store any value here that would benefit from being a store
  // like cultural context entry hash and then the context result vec

  _appletConfig: Writable<AppletConfig> = writable({ dimensions: {}, resource_defs: {}, methods: {}, cultural_contexts: {}, name: "", role_name: "", ranges: {} });
  _contextResults: Writable<ContextResults> = writable({});

  // TODO: update the structure of this store to include dimension and resource type
  /*
  {
    [resourceEh: string]: Array<Assessment>
  }
  */
  _resourceAssessments: Writable<{ [entryHash: string]: Array<Assessment> }> = writable({});
  // #resourceAssessments: Writable<Record<ResourceDefEh, Record<ResourceEh, Record<DimensionEh, Array<Assessment>>>> = writable({});

  /** Static info */
  public myAgentPubKey: AgentPubKey;

  constructor(
    protected service: SensemakerService,
  ) {
    this.myAgentPubKey = service.myPubKey();
  }

  resourceAssessments() {
    return derived(this._resourceAssessments, resourceAssessments => resourceAssessments)
  }

  appletConfig() {
    return derived(this._appletConfig, appletConfig => appletConfig)
  }

  contextResults() {
    return derived(this._contextResults, contextResults => contextResults)
  }

  async createDimension(dimension: Dimension): Promise<EntryHash> {
    const dimensionEh = await this.service.createDimension(dimension);
    this._appletConfig.update(appletConfig => {
      appletConfig.dimensions[dimension.name] = dimensionEh;
      return appletConfig;
    });
    return dimensionEh;
  }

  async createResourceDef(resourceDef: ResourceDef): Promise<EntryHash> {
    const resourceDefEh = await this.service.createResourceDef(resourceDef);
    this._appletConfig.update(appletConfig => {
      appletConfig.resource_defs[resourceDef.name] = resourceDefEh;
      return appletConfig;
    });
    return resourceDefEh;
  }

  async createAssessment(assessment: CreateAssessmentInput): Promise<EntryHash> {
    const assessmentEh = await this.service.createAssessment(assessment);
    this._resourceAssessments.update(resourceAssessments => {
      const maybePrevAssessments = resourceAssessments[encodeHashToBase64(assessment.resource_eh)];
      const prevAssessments = maybePrevAssessments ? maybePrevAssessments : [];
      resourceAssessments[encodeHashToBase64(assessment.resource_eh)] = [...prevAssessments, {...assessment, author: this.myAgentPubKey}]
      return resourceAssessments;
    })
    return assessmentEh;
  }

  async getAssessment(assessmentEh: EntryHash): Promise<HolochainRecord> {
    return await this.service.getAssessment(assessmentEh) 
  }

  async getAssessmentsForResources(getAssessmentsInput: GetAssessmentsForResourceInput): Promise<Record<EntryHashB64, Array<Assessment>>> {
    const resourceAssessments = await this.service.getAssessmentsForResources(getAssessmentsInput);
    // trying to update the store object properly so there is a detected difference between previous and new
    this._resourceAssessments.update(resourceAssessmentsPrev => {
      let resourceAssessmentsNew = {...resourceAssessmentsPrev, ...resourceAssessments};
      return resourceAssessmentsNew;
    });
    return resourceAssessments;
  }
  
  async createMethod(method: Method): Promise<EntryHash> {
    const methodEh = await this.service.createMethod(method);
    this._appletConfig.update(appletConfig => {
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
    this._appletConfig.update(appletConfig => {
      appletConfig.cultural_contexts[culturalContext.name] = contextEh;
      return appletConfig;
    });
    return contextEh;
  }

  async getCulturalContext(culturalContextEh: EntryHash): Promise<HolochainRecord> {
    return await this.service.getCulturalContext(culturalContextEh) 
  }

  async computeContext(contextName: string, computeContextInput: ComputeContextInput): Promise<Array<EntryHash>> {
    const contextResult = await this.service.computeContext(computeContextInput);
    this._contextResults.update(contextResults => {
      contextResults[contextName] = contextResult;
      return contextResults;
    });
    return contextResult;
  }

  async checkIfAppletConfigExists(appletName: string): Promise<Option<AppletConfig>> {
    const maybeAppletConfig = await this.service.checkIfAppletConfigExists(appletName);
    if (maybeAppletConfig) {
      this._appletConfig.update(() => maybeAppletConfig)
    }
    return maybeAppletConfig;
  }

  async registerApplet(appletConfigInput: AppletConfigInput): Promise<AppletConfig> {
    const appletConfig = await this.service.registerApplet(appletConfigInput);
    this._appletConfig.update(() => appletConfig);
    return appletConfig;
  }
}
