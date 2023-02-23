import { RangeValue } from "./range"
import { AgentPubKey, EntryHash, Record } from "@holochain/client"
import { Dimension } from "./dimension"
import { DataSet } from "./method"
import { Option } from "./utils"

export interface CreateAssessmentInput {
    value: RangeValue,
    dimension_eh: EntryHash,
    resource_eh: EntryHash,
    resource_type_eh: EntryHash,
    maybe_input_dataset: Option<DataSet>, // For objective Dimensions only
}

export type Assessment = CreateAssessmentInput & {
    author: AgentPubKey
}

export interface GetAssessmentsForResourceInput {
    resource_eh: EntryHash,
    dimension_eh: EntryHash,
}

export interface AssessmentWithDimensionAndResource {
    assessment: Assessment,
    dimension: Option<Dimension>,
    resource: Option<Record>
}