import { RangeValue } from "./range"
import { AgentPubKey, EntryHash, Record, Timestamp } from "@holochain/client"
import { Dimension, DimensionEh } from "./dimension"
import { DataSet } from "./method"
import { Option } from "./utils"
import { ResourceDefEh, ResourceEh } from "./resourceDef"

export interface CreateAssessmentInput {
    value: RangeValue,
    dimension_eh: EntryHash,
    resource_eh: EntryHash,
    resource_def_eh: EntryHash,
    maybe_input_dataset: Option<DataSet>, // For objective Dimensions only
}

export type Assessment = CreateAssessmentInput & {
    author: AgentPubKey,
    timestamp: Timestamp,
}

export interface GetAssessmentsForResourceInput {
    resource_ehs: ResourceEh[],
    dimension_ehs: DimensionEh[],
}

export interface AssessmentWithDimensionAndResource {
    assessment: Assessment,
    dimension: Option<Dimension>,
    resource: Option<Record>
}

export type AssessmentEh = EntryHash