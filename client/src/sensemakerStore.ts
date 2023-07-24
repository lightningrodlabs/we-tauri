import { AgentPubKey, AppAgentClient, AppSignal, encodeHashToBase64, EntryHash, EntryHashB64, Record as HolochainRecord, RoleName } from '@holochain/client';
import { SensemakerService } from './sensemakerService';
import { AppletConfig, Assessment, ComputeContextInput, ConcreteAssessDimensionWidget, ConcreteDisplayDimensionWidget, CreateAppletConfigInput, CreateAssessmentInput, CulturalContext, Dimension, GetAssessmentsForResourceInput, Method, MethodDimensionMap, ResourceDef, RunMethodInput, SignalPayload, WidgetMappingConfig, WidgetRegistry } from './index';
import { derived, Readable, Writable, writable } from 'svelte/store';
import { getLatestAssessment, Option } from './utils';
import { createContext } from '@lit-labs/context';
import { get } from "svelte/store";

interface ContextResults {
  [culturalContextName: string]: EntryHash[],
}

export class SensemakerStore {
  // store any value here that would benefit from being a store
  // like cultural context entry hash and then the context result vec

  _appletConfigs: Writable<{ [appletName: string]: AppletConfig}> = writable({});
  _contextResults: Writable<ContextResults> = writable({});

  // TODO: update the structure of this store to include dimension and resource type
  /*
  {
    [resourceEh: string]: Array<Assessment>
  }
  */
  _resourceAssessments: Writable<{ [entryHash: string]: Array<Assessment> }> = writable({});
  
  _widgetRegistry: Writable<WidgetRegistry> = writable({});

  _activeMethod: Writable<{
    [resourceDefEh: string]: EntryHashB64 // mapping from resourceDefEh to active methodEh
  }> = writable({});

  _methodDimensionMapping: Writable<MethodDimensionMap> = writable({});


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

  appletConfigs() {
    return derived(this._appletConfigs, appletConfigs => appletConfigs)
  }
  
  flattenedAppletConfigs() {
    return derived(this._appletConfigs, appletConfigs => {
      const flattenedAppletConfigs = Object.values(appletConfigs).reduce((flattenedAppletConfigs, appletConfig) => {
        flattenedAppletConfigs.dimensions = {...flattenedAppletConfigs.dimensions, ...appletConfig.dimensions};
        flattenedAppletConfigs.methods = {...flattenedAppletConfigs.methods, ...appletConfig.methods};
        flattenedAppletConfigs.resource_defs = {...flattenedAppletConfigs.resource_defs, ...appletConfig.resource_defs};
        flattenedAppletConfigs.cultural_contexts = {...flattenedAppletConfigs.cultural_contexts, ...appletConfig.cultural_contexts};
        return flattenedAppletConfigs;
      }, {dimensions: {}, methods: {}, resource_defs: {}, cultural_contexts: {}} as AppletConfig);
      return flattenedAppletConfigs;
    })
  }

  contextResults() {
    return derived(this._contextResults, contextResults => contextResults)
  }

  widgetRegistry() {
    return derived(this._widgetRegistry, widgetRegistry => widgetRegistry)
  }
  
  activeMethod() {
    return derived(this._activeMethod, activeMethod => activeMethod)
  }
  methodDimensionMapping() {
    return derived(this._methodDimensionMapping, methodDimensionMapping => methodDimensionMapping)
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

  myLatestAssessmentAlongDimension(resource_eh: EntryHashB64, dimension_eh: EntryHashB64): Readable<Assessment | null> {
    return derived(this._resourceAssessments, resourceAssessments => {
      const assessments = resourceAssessments[resource_eh];
      if (!assessments) {
        return null;
      }
      const myAssessments = assessments.filter(assessment => encodeHashToBase64(assessment.author) === encodeHashToBase64(this.myAgentPubKey));
      if (myAssessments.length > 0) { 
        return getLatestAssessment(myAssessments, dimension_eh);
      }
      else {
        return null;
      }
    })
  }

  async getAllAgents() {
    return await this.service.getAllAgents();
  }
  
  // TODO: update applet config update to key by applet name
  // async createDimension(dimension: Dimension): Promise<EntryHash> {
  //   const dimensionEh = await this.service.createDimension(dimension);
  //   this._appletConfig.update(appletConfig => {
  //     appletConfig.dimensions[dimension.name] = dimensionEh;
  //     return appletConfig;
  //   });
  //   return dimensionEh;
  // }

  // async createResourceDef(resourceDef: ResourceDef): Promise<EntryHash> {
  //   const resourceDefEh = await this.service.createResourceDef(resourceDef);
  //   this._appletConfig.update(appletConfig => {
  //     appletConfig.resource_defs[resourceDef.name] = resourceDefEh;
  //     return appletConfig;
  //   });
  //   return resourceDefEh;
  // }

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
  
  // async createMethod(method: Method): Promise<EntryHash> {
  //   const methodEh = await this.service.createMethod(method);
  //   this._appletConfig.update(appletConfig => {
  //     appletConfig.methods[method.name] = methodEh;
  //     return appletConfig;
  //   });
  //   return methodEh;
  // }

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

  // async createCulturalContext(culturalContext: CulturalContext): Promise<EntryHash> {
  //   const contextEh = await this.service.createCulturalContext(culturalContext);
  //   this._appletConfig.update(appletConfig => {
  //     appletConfig.cultural_contexts[culturalContext.name] = contextEh;
  //     return appletConfig;
  //   });
  //   return contextEh;
  // }

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
      this._appletConfigs.update((appletConfigs) => 
        {
          appletConfigs[appletName] = maybeAppletConfig;
          return appletConfigs;
        }
      )
    }
    return maybeAppletConfig;
  }

  async registerApplet(appletConfigInput: CreateAppletConfigInput): Promise<AppletConfig> {
    const appletConfig = await this.service.registerApplet(appletConfigInput);
    this._appletConfigs.update((appletConfigs) => {
      appletConfigs[appletConfig.name] = appletConfig;
      return appletConfigs;
    });

    this._methodDimensionMapping.update(methodDimensionMapping => {
      appletConfigInput.applet_config_input.methods.forEach(method => {
        methodDimensionMapping[encodeHashToBase64(appletConfig.methods[method.name])] = {
          inputDimensionEh: get(this.appletConfigs())[appletConfig.name].dimensions[method.input_dimensions[0].name],
          outputDimensionEh: get(this.appletConfigs())[appletConfig.name].dimensions[method.output_dimension.name],
        };
      });
      return methodDimensionMapping;
    });

    // initialize the active method to the first method for each resource def
    Object.values(appletConfig.resource_defs).forEach(resourceDef => {
      // if the active method hasn't been set yet, set it.
      if (!get(this._activeMethod)[encodeHashToBase64(resourceDef)]) {
        this.updateActiveMethod(encodeHashToBase64(resourceDef), encodeHashToBase64(Object.values(appletConfig.methods)[0]));
      }
    });
    return appletConfig;
  }

  updateActiveMethod(resourceDefEh: EntryHashB64, methodEh: EntryHashB64) {
    this._activeMethod.update((activeMethods) => {
      activeMethods[resourceDefEh] = methodEh;
      return activeMethods;
    });
  }

  registerWidget(
    dimensionEhs: EntryHashB64[], 
    displayWidget: typeof ConcreteDisplayDimensionWidget,
    assessWidget: typeof ConcreteAssessDimensionWidget
  ) {
      this._widgetRegistry.update(widgetRegistry => {
        dimensionEhs.forEach(dimensionEh => {
        widgetRegistry[dimensionEh] = {
          display: displayWidget,
          assess: assessWidget
        } 
      })
        return widgetRegistry;
      }
    )
  }
}

export const sensemakerStoreContext = createContext<SensemakerStore>(
  'sensemaker-store-context'
);