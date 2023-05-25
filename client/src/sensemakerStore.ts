import { AgentPubKey, AppAgentClient, AppSignal, encodeHashToBase64, EntryHash, EntryHashB64, Record as HolochainRecord, RoleName } from '@holochain/client';
import { SensemakerService } from './sensemakerService';
import { AppletConfig, AppletUIConfig, Assessment, ComputeContextInput, ConcreteAssessDimensionWidget, ConcreteDisplayDimensionWidget, CreateAppletConfigInput, CreateAssessmentInput, CulturalContext, Dimension, GetAssessmentsForResourceInput, Method, ResourceDef, RunMethodInput, SignalPayload, WidgetRegistry } from './index';
import { derived, Writable, writable } from 'svelte/store';
import { Option } from './utils';
import { createContext } from '@lit-labs/context';

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
  
  // TODO: we probably want there to be a default Applet UI Config, specified in the applet config or somewhere.
  _appletUIConfig: Writable<AppletUIConfig> = writable({});
  /*
  {
    [resourceDefEh: string]: {
      display_objective_dimension: EntryHash, // the dimension eh
      create_assessment_dimension: EntryHash, // the dimension eh
    }
  }
  */
  _widgetRegistry: Writable<WidgetRegistry> = writable({});

  /** Static info */
  public myAgentPubKey: AgentPubKey;
  protected service: SensemakerService;

  constructor(public client: AppAgentClient, public roleName: RoleName, public zomeName = 'sensemaker')
  {
    client.on("signal", (signal: AppSignal) => {
      console.log("received signal in sensemaker store: ", signal)
      const payload = (signal.payload as SignalPayload);

      switch (payload.type) {
        case "NewAssessment":
          const assessment = payload.assessment;
          this._resourceAssessments.update(resourceAssessments => {
            const maybePrevAssessments = resourceAssessments[encodeHashToBase64(assessment.resource_eh)];
            const prevAssessments = maybePrevAssessments ? maybePrevAssessments : [];
            resourceAssessments[encodeHashToBase64(assessment.resource_eh)] = [...prevAssessments, assessment]
            return resourceAssessments;
          })
          break;
      }
    });
    
    this.service = new SensemakerService(client, roleName);
    this.myAgentPubKey = this.service.myPubKey();
  }

  // if provided a list of resource ehs, filter the assessments to only those resources, and return that object, otherwise return the whole thing.
  resourceAssessments(resource_ehs?: Array<EntryHashB64>) {
    return derived(this._resourceAssessments, resourceAssessments => {
      if(resource_ehs) {
        const filteredResourceAssessments = resource_ehs.reduce((resourceSubsetAssessment, resource_eh) => {
          if (resourceAssessments.hasOwnProperty(resource_eh)) {
            resourceSubsetAssessment[resource_eh] = resourceAssessments[resource_eh];
          }
          return resourceSubsetAssessment;
        }, {});
        return filteredResourceAssessments;
      }
      else {
        return resourceAssessments;
      }
    })
  }

  appletConfig() {
    return derived(this._appletConfig, appletConfig => appletConfig)
  }

  contextResults() {
    return derived(this._contextResults, contextResults => contextResults)
  }

  appletUIConfig() {
    return derived(this._appletUIConfig, appletUIConfig => appletUIConfig)
  }

  widgetRegistry() {
    return derived(this._widgetRegistry, widgetRegistry => widgetRegistry)
  }

  isAssessedByMeAlongDimension(resource_eh: EntryHashB64, dimension_eh: EntryHashB64) {
    return derived(this._resourceAssessments, resourceAssessments => {
      const assessments = resourceAssessments[resource_eh];
      if (assessments) {
        return assessments.some(assessment => encodeHashToBase64(assessment.author) === encodeHashToBase64(this.myAgentPubKey) && encodeHashToBase64(assessment.dimension_eh) === dimension_eh);
      }
      else {
        return false;
      }
    })
  }

  async getAllAgents() {
    return await this.service.getAllAgents();
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
      // TODO: here is an instance where returning the assessment instead of the hash would be useful
      // NOTE: there will be a slight discrepancy between the assessment returned from the service and the one stored in the store
      // because we are not returning the assessment, and so recreating the timestamp. This works enough for now, but would be worth it to change
      // it such that the assessment itself is return.
      resourceAssessments[encodeHashToBase64(assessment.resource_eh)] = [...prevAssessments, {...assessment, author: this.myAgentPubKey, timestamp: Date.now() * 1000}]
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

  async runMethod(runMethodInput: RunMethodInput): Promise<Assessment> {
    let assessment = await this.service.runMethod(runMethodInput);
    this._resourceAssessments.update(resourceAssessments => {
      const maybePrevAssessments = resourceAssessments[encodeHashToBase64(assessment.resource_eh)];
      const prevAssessments = maybePrevAssessments ? maybePrevAssessments : [];
      resourceAssessments[encodeHashToBase64(runMethodInput.resource_eh)] = [...prevAssessments, assessment]
      return resourceAssessments;
    })
    return assessment;
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

  async registerApplet(appletConfigInput: CreateAppletConfigInput): Promise<AppletConfig> {
    const appletConfig = await this.service.registerApplet(appletConfigInput);
    this._appletConfig.update(() => appletConfig);
    return appletConfig;
  }

  async updateAppletUIConfig(
    resourceDefEh: EntryHashB64, 
    currentObjectiveDimensionEh: EntryHash, 
    currentCreateAssessmentDimensionEh: EntryHash,
    currentMethodEh: EntryHash
  ) {
    this._appletUIConfig.update(appletUIConfig => {
      appletUIConfig[resourceDefEh] = {
        display_objective_dimension: currentObjectiveDimensionEh,
        create_assessment_dimension: currentCreateAssessmentDimensionEh,
        method_for_created_assessment: currentMethodEh
      } 
      return appletUIConfig;
    }
    )
  }

  async registerWidget(
    dimensionEh: EntryHashB64, 
    displayWidget: typeof ConcreteDisplayDimensionWidget,
    assessWidget: typeof ConcreteAssessDimensionWidget
  ) {
      this._widgetRegistry.update(widgetRegistry => {
        widgetRegistry[dimensionEh] = {
          display: displayWidget,
          assess: assessWidget
        } 
        return widgetRegistry;
      }
    )
  }
}

export const sensemakerStoreContext = createContext<SensemakerStore>(
  'sensemaker-store-context'
);