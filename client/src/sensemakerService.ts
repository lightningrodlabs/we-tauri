import { AgentPubKey, AppAgentCallZomeRequest, AppAgentClient, EntryHash, EntryHashB64, Record as HolochainRecord, RoleName } from '@holochain/client';
import { AppletConfig, AppletConfigInput, Assessment, ComputeContextInput, CreateAssessmentInput, CulturalContext, Dimension, GetAssessmentsForResourceInput, Method, Range, ResourceDef, RunMethodInput } from './index';
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
  
  async createRange(range: Range): Promise<EntryHash> {
    return this.callZome('create_range', range);
  }

  async getRange(rangeEh: EntryHash): Promise<HolochainRecord> {
    return this.callZome('get_range', rangeEh);
  }

  async getRanges(): Promise<Array<HolochainRecord>> {
    return this.callZome('get_ranges', null);
  }

  async createDimension(dimension: Dimension): Promise<EntryHash> {
    return this.callZome('create_dimension', dimension);
  }

  async getDimension(dimensionEh: EntryHash): Promise<HolochainRecord> {
    return this.callZome('get_dimension', dimensionEh);
  }

  async getDimensions(): Promise<Array<HolochainRecord>> {
    return this.callZome('get_dimensions', null);
  }

  async createResourceDef(resourceDef: ResourceDef): Promise<EntryHash> {
    return this.callZome('create_resource_def', resourceDef);
  }

  async getResourceDef(dimensionEh: EntryHash): Promise<HolochainRecord> {
    return this.callZome('get_resource_def', dimensionEh);
  }

  async createAssessment(assessment: CreateAssessmentInput): Promise<EntryHash> {
    return this.callZome('create_assessment', assessment);
  }

  async getAssessment(assessmentEh: EntryHash): Promise<HolochainRecord> {
    return this.callZome('get_assessment', assessmentEh);
  }

  async getAssessmentsForResources(getAssessmentsInput: GetAssessmentsForResourceInput): Promise<Record<EntryHashB64, Array<Assessment>>> {
    return this.callZome('get_assessments_for_resources', getAssessmentsInput);
  }
  
  async createMethod(method: Method): Promise<EntryHash> {
    return this.callZome('create_method', method);
  }

  async getMethod(methodEh: EntryHash): Promise<HolochainRecord> {
    return this.callZome('get_method', methodEh);
  }

  async runMethod(runMethodInput: RunMethodInput): Promise<Assessment> {
    return this.callZome('run_method', runMethodInput);
  }

  async createCulturalContext(culturalContext: CulturalContext): Promise<EntryHash> {
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
