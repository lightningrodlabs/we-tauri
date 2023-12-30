import { AgentPubKey, AppAgentCallZomeRequest, AppAgentClient, EntryHash, EntryHashB64, Record as HolochainRecord, RoleName } from '@holochain/client';
import { AppletConfig, AppletConfigInput, Assessment, AssessmentWidgetBlockConfig, AssessmentWidgetRegistrationInput, ComputeContextInput, CreateAssessmentInput, CulturalContext, Dimension, GetAssessmentsForResourceInput, GetMethodsForDimensionQueryParams, Method, Range, ResourceDef, RunMethodInput } from './index';
import { Option } from './utils';

export class SensemakerService {
  constructor(public client: AppAgentClient, public roleName: RoleName, public zomeName = 'sensemaker') {}

    /**
   * Get my agentkey, if it has been created
   * @returns my AgentPubKey
   */
    myPubKey(): AgentPubKey {
      return this.client.myPubKey
    }
    
  async getAllAgents(): Promise<AgentPubKey[]> {
    return this.callZome('get_all_agents', null);
  }
  
  async createRange(range: Range): Promise<HolochainRecord> {
    return this.callZome('create_range', range);
  }

  async getRange(rangeEh: EntryHash): Promise<HolochainRecord> {
    return this.callZome('get_range', rangeEh);
  }

  async getRanges(): Promise<Array<HolochainRecord>> {
    return this.callZome('get_ranges', null);
  }

  async createDimension(dimension: Dimension): Promise<HolochainRecord> {
    return this.callZome('create_dimension', dimension);
  }

  async createOutputDimensionAndMethodAtomically(input: {outputDimension: Dimension, partialMethod: Partial<Method>}): Promise<HolochainRecord[]> {
    return this.callZome('atomic_create_dimension_with_method', input);
  }

  async getDimension(dimensionEh: EntryHash): Promise<HolochainRecord> {
    return this.callZome('get_dimension', dimensionEh);
  }

  async getDimensions(): Promise<Array<HolochainRecord>> {
    return this.callZome('get_dimensions', null);
  }

  async createResourceDef(resourceDef: ResourceDef): Promise<HolochainRecord> {
    return this.callZome('create_resource_def', resourceDef);
  }

  async getResourceDef(dimensionEh: EntryHash): Promise<HolochainRecord> {
    return this.callZome('get_resource_def', dimensionEh);
  }

  async getResourceDefs(): Promise<Array<HolochainRecord>> {
    return this.callZome('get_resource_defs', null)
  }

  async createAssessment(assessment: CreateAssessmentInput): Promise<HolochainRecord> {
    return this.callZome('create_assessment', assessment);
  }

  async getAssessment(assessmentEh: EntryHash): Promise<HolochainRecord> {
    return this.callZome('get_assessment', assessmentEh);
  }

  async getAssessmentsForResources(getAssessmentsInput: GetAssessmentsForResourceInput): Promise<Record<EntryHashB64, Array<Assessment>>> {
    return this.callZome('get_assessments_for_resources', getAssessmentsInput);
  }
  
  async createMethod(method: Method): Promise<HolochainRecord> {
    return this.callZome('create_method', method);
  }

  async getMethod(methodEh: EntryHash): Promise<HolochainRecord> {
    return this.callZome('get_method', methodEh);
  }

  async runMethod(runMethodInput: RunMethodInput): Promise<Assessment> {
    return this.callZome('run_method', runMethodInput);
  }

  async getMethods(): Promise<Array<HolochainRecord>> {
    return this.callZome('get_methods', null)
  }

  async getMethodsForDimensionEntryHash(queryParams?: GetMethodsForDimensionQueryParams): Promise<Array<HolochainRecord>> {
    return this.callZome('get_methods_for_dimension', { query: queryParams || null })
  }

  async getAssessmentWidgetTrayConfig(resourceDefEh: EntryHash): Promise<Array<AssessmentWidgetBlockConfig>> {
    return this.callZome('get_assessment_widget_tray_config', { resourceDefEh }, 'widgets')
  }

  async setAssessmentWidgetTrayConfig(resourceDefEh: EntryHash, widgetConfigs: Array<AssessmentWidgetBlockConfig>): Promise<Array<EntryHash>> {
    return this.callZome('set_assessment_widget_tray_config', { resourceDefEh, widgetConfigs }, 'widgets')
  }

  async createCulturalContext(culturalContext: CulturalContext): Promise<HolochainRecord> {
    return this.callZome('create_cultural_context', culturalContext);
  }

  async getCulturalContext(culturalContextEh: EntryHash): Promise<HolochainRecord> {
    return this.callZome('get_cultural_context', culturalContextEh);
  }

  async computeContext(computeContextInput: ComputeContextInput): Promise<Array<EntryHash>> {
    return this.callZome('compute_context', computeContextInput);
  }

  async checkIfAppletConfigExists(appletName: string): Promise<Option<AppletConfig>> {
    return this.callZome('check_if_applet_config_exists', appletName);
  }

  async registerApplet(appletConfig: AppletConfigInput): Promise<AppletConfig> {
    return this.callZome('register_applet', appletConfig);
  }
  
  async registerWidget(widgetRegistration: AssessmentWidgetRegistrationInput) : Promise<HolochainRecord> {
    return this.callZome('register_assessment_widget', widgetRegistration, 'widgets');
  }

  async getRegisteredWidgets(): Promise<Array<HolochainRecord>> {
    return this.callZome('get_assessment_widget_registrations', null, 'widgets');
  }

  private callZome(fn_name: string, payload: any, zomeName = this.zomeName) {
    const req: AppAgentCallZomeRequest = {
      role_name: this.roleName,
      zome_name: zomeName,
      fn_name,
      payload
    }
    return this.client.callZome(req);
  }
}
