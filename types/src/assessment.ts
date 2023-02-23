import { AgentPubKey, EntryHash } from "@holochain/client"
import { RangeValue } from "./range"
import { DataSet } from "./method"
import { Option } from "./utils"

export interface CreateAssessmentInput {
    value: RangeValue,
    dimension_eh: EntryHash,
    subject_eh: EntryHash,
    maybe_input_dataSet: Option<DataSet>, // For objective Dimensions only
}

export type Assessment = CreateAssessmentInput & {
    author: AgentPubKey
}

export interface GetAssessmentsForResourceInput {
    resource_eh: EntryHash,
    dimension_eh: EntryHash,
}
