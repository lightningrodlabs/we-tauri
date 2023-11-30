import { AgentPubKey, AppAgentClient, AppSignal, encodeHashToBase64, EntryHash, EntryHashB64, Record as HolochainRecord, RoleName } from '@holochain/client';
import { SensemakerService } from './sensemakerService';
import { AppletConfig, AppletConfigInput, Assessment, ComputeContextInput, ConcreteAssessDimensionWidget, ConcreteDisplayDimensionWidget, CreateAssessmentInput, CulturalContext, Dimension, GetAssessmentsForResourceInput, Method, MethodDimensionMap, Range, ResourceDef, RunMethodInput, SignalPayload, WidgetMappingConfig, WidgetRegistry, AssessmentWidgetBlockConfig, GetMethodsForDimensionQueryParams } from './index';
import { derived, Readable, Writable, writable } from 'svelte/store';
import { getLatestAssessment, Option } from './utils';
import { createContext } from '@lit-labs/context';
import { get } from "svelte/store";
import { EntryRecord } from '@holochain-open-dev/utils';

interface ContextResults {
  [culturalContextName: string]: EntryHash[],
}

export class SensemakerStore {
  _contextResults: Writable<ContextResults> = writable({});

  ranges: Writable<Map<EntryHashB64, Range>> = writable(new Map<EntryHashB64, Range>());
  dimensions: Writable<Map<EntryHashB64, Dimension>> = writable(new Map<EntryHashB64, Dimension>());
  methods: Writable<Map<EntryHashB64, Method>> = writable(new Map<EntryHashB64, Method>());
  resourceDefinitions: Writable<Map<EntryHashB64, ResourceDef>> = writable(new Map<EntryHashB64, ResourceDef>());
  contexts: Writable<Map<string, Map<EntryHashB64, CulturalContext>>> = writable(new Map<string, Map<EntryHashB64, CulturalContext>>());

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
  
  async createRange(range: Range): Promise<EntryHash> {
    const rangeRecord = await this.service.createRange(range);
    const entryRecord = new EntryRecord<Range>(rangeRecord);
    this.ranges.update(ranges => {
      ranges.set(encodeHashToBase64(entryRecord.entryHash), entryRecord.entry);
      return ranges;
    });
    return entryRecord.entryHash;
  }

  async getRange(rangeEh: EntryHash): Promise<Range> {
    const range = get(this.ranges).get(encodeHashToBase64(rangeEh));
    if(range) {
      return range;
    }
    else {
      const rangeRecord = await this.service.getRange(rangeEh) 
      const entryRecord = new EntryRecord<Range>(rangeRecord);
      this.ranges.update(ranges => {
        ranges.set(encodeHashToBase64(entryRecord.entryHash), entryRecord.entry);
        return ranges;
      });
      return entryRecord.entry;
    }
  }

  async getRanges(): Promise<Array<Range>> {
    const rangeRecords = await this.service.getRanges();
    const entryRecords = rangeRecords.map(rangeRecord => new EntryRecord<Range>(rangeRecord));
    this.ranges.update(ranges => {
      entryRecords.forEach(entryRecord => {
        ranges.set(encodeHashToBase64(entryRecord.entryHash), entryRecord.entry);
      });
      return ranges;
    });
    return entryRecords.map(entryRecord => entryRecord.entry);
  }

  // TODO: update applet config update to key by applet name
  async createDimension(dimension: Dimension): Promise<EntryHash> {
    const dimensionRecord = await this.service.createDimension(dimension);
    const entryRecord = new EntryRecord<Dimension>(dimensionRecord);
    this.dimensions.update(dimensions => {
      dimensions.set(encodeHashToBase64(entryRecord.entryHash), entryRecord.entry);
      return dimensions;
    });
    return entryRecord.entryHash;
  }

  async getDimension(dimensionEh: EntryHash): Promise<Dimension> {
    const dimension = get(this.dimensions).get(encodeHashToBase64(dimensionEh));
    if(dimension) {
      return dimension;
    }
    else {
      const dimensionRecord = await this.service.getDimension(dimensionEh) 
      const entryRecord = new EntryRecord<Dimension>(dimensionRecord);
      this.dimensions.update(dimensions => {
        dimensions.set(encodeHashToBase64(entryRecord.entryHash), entryRecord.entry);
        return dimensions;
      });
      return entryRecord.entry;
    }
  }

  async getDimensions(): Promise<Array<Dimension>> {
    const dimensionRecords = await this.service.getDimensions();
    const entryRecords = dimensionRecords.map(dimensionRecord => new EntryRecord<Dimension>(dimensionRecord));
    this.dimensions.update(dimensions => {
      entryRecords.forEach(entryRecord => {
        dimensions.set(encodeHashToBase64(entryRecord.entryHash), entryRecord.entry);
      });
      return dimensions;
    });
    return entryRecords.map(entryRecord => entryRecord.entry);
  }

  async createResourceDef(resourceDef: ResourceDef): Promise<EntryHash> {
    const resourceDefRecord = await this.service.createResourceDef(resourceDef);
    const entryRecord = new EntryRecord<ResourceDef>(resourceDefRecord);
    this.resourceDefinitions.update(resourceDefs => {
      resourceDefs.set(encodeHashToBase64(entryRecord.entryHash), entryRecord.entry);
      return resourceDefs;
    });
    return entryRecord.entryHash;
  }

  async getResourceDef(resourceDefEh: EntryHash): Promise<ResourceDef> {
    const resourceDef = get(this.resourceDefinitions).get(encodeHashToBase64(resourceDefEh));
    if(resourceDef) {
      return resourceDef;
    }
    else {
      const resourceDefRecord = await this.service.getResourceDef(resourceDefEh) 
      const entryRecord = new EntryRecord<ResourceDef>(resourceDefRecord);
      this.resourceDefinitions.update(resourceDefs => {
        resourceDefs.set(encodeHashToBase64(entryRecord.entryHash), entryRecord.entry);
        return resourceDefs;
      });
      return entryRecord.entry;
    }
  }

  async createAssessment(assessment: CreateAssessmentInput): Promise<EntryHash> {
    const assessmentRecord = await this.service.createAssessment(assessment);
    const entryRecord = new EntryRecord<Assessment>(assessmentRecord);
    this._resourceAssessments.update(resourceAssessments => {
      const maybePrevAssessments = resourceAssessments[encodeHashToBase64(assessment.resource_eh)];
      const prevAssessments = maybePrevAssessments ? maybePrevAssessments : [];
      resourceAssessments[encodeHashToBase64(assessment.resource_eh)] = [...prevAssessments, entryRecord.entry]
      return resourceAssessments;
    })
    return entryRecord.entryHash;
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
    const methodRecord = await this.service.createMethod(method);
    const entryRecord = new EntryRecord<Method>(methodRecord);
    this.methods.update((methods) => {
      methods.set(encodeHashToBase64(entryRecord.entryHash), entryRecord.entry);
      return methods;
    });
    return entryRecord.entryHash;
  }

  async getMethod(methodEh: EntryHash): Promise<Method> {
    const method = get(this.methods).get(encodeHashToBase64(methodEh));
    if (method) {
      return method;
    }
    else {
      const methodRecord = await this.service.getMethod(methodEh) 
      const entryRecord = new EntryRecord<Method>(methodRecord);
      this.methods.update((methods) => {
        methods.set(encodeHashToBase64(entryRecord.entryHash), entryRecord.entry);
        return methods;
      });
      return entryRecord.entry;
    }
  }
  async getMethods(): Promise<Array<Method>> {
      const methodRecords : HolochainRecord[] = await this.service.getMethods(); 
      const entryRecords = methodRecords.map((record: HolochainRecord) => new EntryRecord<Method>(record));
      this.methods.update(methods => {
        entryRecords.forEach(entryRecord => {
          methods.set(encodeHashToBase64(entryRecord.entryHash), entryRecord.entry);
        });
        return methods;
      });
      return entryRecords.map(entryRecord => entryRecord.entry);
  }
  async getMethodsForDimension(queryParams: GetMethodsForDimensionQueryParams): Promise<Array<Method>> {
    // TODO: get from memory first?
      const methodRecords : HolochainRecord[] = await this.service.getMethodsForDimensionEntryHash(queryParams); 
      const entryRecords = methodRecords.map((record: HolochainRecord) => new EntryRecord<Method>(record));

      return entryRecords.map(entryRecord => entryRecord.entry);
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

  async createCulturalContext(culturalContext: CulturalContext, appletName: string): Promise<EntryHash> {
    const contextRecord = await this.service.createCulturalContext(culturalContext);
    const entryRecord = new EntryRecord<CulturalContext>(contextRecord);
    this.contexts.update(contexts => {
      const appletContexts = contexts.get(appletName);
      if (appletContexts) {
        appletContexts.set(encodeHashToBase64(entryRecord.entryHash), entryRecord.entry);
        contexts.set(appletName, appletContexts);
      }
      else {
        contexts.set(appletName, new Map<EntryHashB64, CulturalContext>([[encodeHashToBase64(entryRecord.entryHash), entryRecord.entry]]));
      }
      return contexts;
    }); 
    return entryRecord.entryHash;
  }

  async getCulturalContext(culturalContextEh: EntryHash): Promise<HolochainRecord> {
    // :TODO: if we want cultural contexts to be bound to applets, it should be part of the cultural context entry.
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

  async getAssessmentWidgetTrayConfig(resourceDefEh: EntryHash): Promise<Array<AssessmentWidgetBlockConfig>> {
    return await this.service.getAssessmentWidgetTrayConfig(resourceDefEh)
  }

  async setAssessmentWidgetTrayConfig(resourceDefEh: EntryHash, widgetConfigs: Array<AssessmentWidgetBlockConfig>): Promise<Boolean> {
    await this.service.setAssessmentWidgetTrayConfig(resourceDefEh, widgetConfigs) // returns an array of config hashes, but not useful as yet
    return true
  }

  async updateAppletConfig(appletConfig: AppletConfig): Promise<AppletConfig> {
    // update all the primitives in their respective store
    for (const rangeEh of Object.values(appletConfig.ranges)) {
      await this.getRange(rangeEh);
    }
    for (const dimensionEh of Object.values(appletConfig.dimensions)) {
      await this.getDimension(dimensionEh);
    }
    for (const methodEh of Object.values(appletConfig.methods)) {
      const method = await this.getMethod(methodEh);

      // update the method dimension mapping
      // NOTE: this will be removed when we have widget configurations implemented
      this._methodDimensionMapping.update((methodDimensionMapping) => {
        methodDimensionMapping[encodeHashToBase64(methodEh)] = {
          inputDimensionEh: method.input_dimension_ehs[0],
          outputDimensionEh: method.output_dimension_eh,
        };
        return methodDimensionMapping;
      });
    }
    for (const resourceDefEh of Object.values(appletConfig.resource_defs)) {
      await this.getResourceDef(resourceDefEh);
      // initialize the active method to the first method for each resource def
      this.updateActiveMethod(
        encodeHashToBase64(resourceDefEh),
        Array.from(get(this.methods).keys())[0]
      );
    }
    for (const contextEh of Object.values(appletConfig.cultural_contexts)) {
      const contextRecord = await this.getCulturalContext(contextEh);
      const entryRecord = new EntryRecord<CulturalContext>(contextRecord);
      this.contexts.update((contexts) => {
        const appletContexts = contexts.get(appletConfig.name);
        if (appletContexts) {
          appletContexts.set(encodeHashToBase64(entryRecord.entryHash), entryRecord.entry);
          contexts.set(appletConfig.name, appletContexts);
        } else {
          contexts.set(
            appletConfig.name,
            new Map<EntryHashB64, CulturalContext>([
              [encodeHashToBase64(entryRecord.entryHash), entryRecord.entry],
            ])
          );
        }
        return contexts;
      });
    }
    return appletConfig;
  }
  
  async checkIfAppletConfigExists(appletName: string): Promise<Option<AppletConfig>> {
    const maybeAppletConfig = await this.service.checkIfAppletConfigExists(appletName);
    if (maybeAppletConfig) {
      await this.updateAppletConfig(maybeAppletConfig);
    }
    return maybeAppletConfig;
  }

  async registerApplet(appletConfigInput: AppletConfigInput): Promise<AppletConfig> {
    const appletConfig = await this.service.registerApplet(appletConfigInput);
    return await this.updateAppletConfig(appletConfig);
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