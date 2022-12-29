import { AgentPubKey, AppEntryType, EntryHash } from "@holochain/client"

export type Option<Inner> = Inner | null

export interface Dimension {
    name: string,
    range: Range,
    computed: boolean,
}

export interface Range {
    name: string,
    kind: RangeKind,
}

export type RangeKind = RangeKindInteger | RangeKindFloat


export interface RangeKindInteger {
    Integer: {
        min: number,
        max: number,
    }
}

export interface RangeKindFloat {
    Float: {
        min: number,
        max: number,
    }
}

export type RangeValue = RangeValueInteger | RangeValueFloat

export interface RangeValueInteger {
    Integer: number,
}

export interface RangeValueFloat {
    Float: number,
}

export interface ResourceType {
    name: string,
    base_types: Array<AppEntryType>,
    dimension_ehs: Array<EntryHash>,
}

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

export interface Method {
    name: String,
    target_resource_type_eh: EntryHash,
    input_dimension_ehs: Array<EntryHash>,
    output_dimension_eh: EntryHash,
    program: Program, // making enum for now, in design doc it is `AST`
    can_compute_live: boolean,
    must_publish_dataset: boolean,
}

export interface RunMethodInput {
    resource_eh: EntryHash,
    method_eh: EntryHash,
}
export interface DataSet {
    from: EntryHash,
    data_points: {
        [key: string]: Array<EntryHash>, // key cannot be of type Uint8Array, specifying as string for now as we are not currently using `DataSet`
    }
}

export type Program = ProgramSum | ProgramAverage

export interface ProgramSum {
    Sum: null,
}

export interface ProgramAverage {
    Average: null,
}

export interface CulturalContext {
    name: String,
    resource_type_eh: EntryHash,
    thresholds: Array<Threshold>,
    order_by: Array<[EntryHash, OrderingKind]>, // DimensionEh
}

export interface ContextResult {
    context_eh: EntryHash,
    dimension_ehs: Array<EntryHash>, // of objective dimensions
    result: Array<[EntryHash, Array<RangeValue>]>,
}

export interface ComputeContextInput {
    resource_ehs: Array<EntryHash>,
    context_eh: EntryHash,
    can_publish_result: boolean,
}

export interface Threshold {
    dimension_eh: EntryHash,
    kind: ThresholdKind,
    value: RangeValue,
}

export type OrderingKind = OrderingKindBiggest | OrderingKindSmallest

export interface OrderingKindBiggest {
    Biggest: null,
}

export interface OrderingKindSmallest {
    Smallest: null,
}

export type ThresholdKind = ThresholdKindGreaterThan | ThresholdKindLessThan | ThresholdKindEqual

export interface ThresholdKindGreaterThan {
    GreaterThan: null,
}

export interface ThresholdKindLessThan {
    LessThan: null,
}

export interface ThresholdKindEqual {
    Equal: null,
}
