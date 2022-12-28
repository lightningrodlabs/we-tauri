import { AgentPubKey, EntryHash, Record } from '@holochain/client';
import { SensemakerService } from './sensemakerService';
import { Assessment, ComputeContextInput, CulturalContext, Dimension, Method, ResourceType, RunMethodInput } from './sensemakerTypes';

export class SensemakerStore {
  // store any value here that would benefit from being a store
  // like cultural context entry hash and then the context result vec

  /** Static info */
  public myAgentPubKey: AgentPubKey;

  constructor(
    protected service: SensemakerService,
  ) {
    this.myAgentPubKey = service.cellClient.cell.cell_id[1];
  }

  async createDimension(dimension: Dimension): Promise<EntryHash> {
    return await this.service.createDimension(dimension) 
  }

  async createResourceType(resourceType: ResourceType): Promise<EntryHash> {
    return await this.service.createResourceType(resourceType) 
  }

  async createAssessment(assessment: Assessment): Promise<EntryHash> {
    return await this.service.createAssessment(assessment) 
  }

  async getAssessment(assessmentEh: EntryHash): Promise<Record> {
    return await this.service.getAssessment(assessmentEh) 
  }
  
  async createMethod(method: Method): Promise<EntryHash> {
    return await this.service.createMethod(method) 
  }

  async runMethod(runMethodInput: RunMethodInput): Promise<EntryHash> {
    return await this.service.runMethod(runMethodInput) 
  }

  async createCulturalContext(culturalContext: CulturalContext): Promise<EntryHash> {
    return await this.service.createCulturalContext(culturalContext) 
  }

  async getCulturalContext(culturalContextEh: EntryHash): Promise<Record> {
    return await this.service.getCulturalContext(culturalContextEh) 
  }

  async computeContext(computeContextInput: ComputeContextInput): Promise<Array<EntryHash>> {
    return await this.service.computeContext(computeContextInput) 
  }
}
