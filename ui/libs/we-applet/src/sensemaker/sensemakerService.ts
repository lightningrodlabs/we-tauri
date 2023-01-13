import { CellClient } from '@holochain-open-dev/cell-client';
import { AgentPubKey, EntryHash, Record } from '@holochain/client';
import { Assessment, CulturalContext, Dimension, Method, ResourceType, RunMethodInput } from './sensemakerTypes';

export class SensemakerService {
  constructor(public cellClient: CellClient, public zomeName = 'sensemaker') {}

    

  async createDimension(dimension: Dimension): Promise<EntryHash> {
    return this.callZome('create_dimension', dimension);
  }

  async createResourceType(resourceType: ResourceType): Promise<EntryHash> {
    return this.callZome('create_resource_type', resourceType);
  }

  async createAssessment(assessment: Assessment): Promise<EntryHash> {
    return this.callZome('create_assessment', assessment);
  }

  async getAssessment(assessmentEh: EntryHash): Promise<Record> {
    return this.callZome('get_assessment', assessmentEh);
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

  async computeContext(computeContextInput: EntryHash): Promise<Record> {
    return this.callZome('compute_context', computeContextInput);
  }

  private callZome(fn_name: string, payload: any) {
    return this.cellClient.callZome(this.zomeName, fn_name, payload);
  }
}
