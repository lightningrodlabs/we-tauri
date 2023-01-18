import { EntryHash } from "@holochain/client"
import { Dimension, RangeValue } from "./dimension"
import { ConfigResourceType } from "./resourceType"

interface CoreCulturalContext {
    name: string,
}
export type CulturalContext = CoreCulturalContext & {
    resource_type_eh: EntryHash,
    order_by: Array<[EntryHash, OrderingKind]>,
    thresholds: Array<Threshold>,
}

export type ConfigCulturalContext = CoreCulturalContext & {
    resource_type: ConfigResourceType,
    order_by: Array<[Dimension, OrderingKind]>,
    thresholds: Array<ConfigThreshold>,
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

interface CoreThreshold {
    kind: ThresholdKind,
    value: RangeValue,
}
export type Threshold = CoreThreshold & {
    dimension_eh: EntryHash,
}

export type ConfigThreshold = CoreThreshold & {
    dimension: Dimension,
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
