import { CellClient } from '@holochain-open-dev/cell-client';
import { AgentPubKey, EntryHash, Record } from '@holochain/client';
import { AppletConfig, AppletConfigInput, Assessment, ComputeContextInput, CreateAssessmentInput, CulturalContext, Dimension, GetAssessmentsForResourceInput, Method, ResourceType, RunMethodInput } from '@neighbourhoods/sensemaker-lite-types';
import { Option } from './sensemakerTypes';

export class SensemakerService {
  constructor(public cellClient: CellClient, public zomeName = 'sensemaker') {}

    

  async createDimension(dimension: Dimension): Promise<EntryHash> {
    return this.callZome('create_dimension', dimension);
  }

  async createResourceType(resourceType: ResourceType): Promise<EntryHash> {
    return this.callZome('create_resource_type', resourceType);
  }

  async createAssessment(assessment: CreateAssessmentInput): Promise<EntryHash> {
    return this.callZome('create_assessment', assessment);
  }

  async getAssessment(assessmentEh: EntryHash): Promise<Record> {
    return this.callZome('get_assessment', assessmentEh);
  }

  async getAssessmentsForResource(getAssessmentsInput: GetAssessmentsForResourceInput): Promise<Array<Assessment>> {
    return this.callZome('get_assessments_for_resource', getAssessmentsInput);
  }
  
  async createMethod(method: Method): Promise<EntryHash> {
    return this.callZome('create_method', method);
  }

  async runMethod(runMethodInput: RunMethodInput): Promise<EntryHash> {
    return this.callZome('run_method', runMethodInput);
  }

  async createCulturalContext(culturalContext: CulturalContext): Promise<EntryHash> {
    return this.callZome('create_cultural_context', culturalContext);
  }

  async getCulturalContext(culturalContextEh: EntryHash): Promise<Record> {
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

  private callZome(fn_name: string, payload: any) {
    return this.cellClient.callZome(this.zomeName, fn_name, payload);
  }
}
