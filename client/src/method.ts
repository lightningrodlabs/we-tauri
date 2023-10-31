import { EntryHash } from "@holochain/client"
import { ConfigDimension, Dimension } from "./dimension"
import { ConfigResourceDef } from "./resourceDef"

interface CoreMethod {
    name: string,
    program: Program,
    can_compute_live: boolean,
    requires_validation: boolean,
}
export type Method = CoreMethod & {
    input_dimension_ehs: Array<EntryHash>,
    output_dimension_eh: EntryHash,
}

export type ConfigMethod = CoreMethod & {
    input_dimensions: Array<ConfigDimension>,
    output_dimension: ConfigDimension,
}

export interface RunMethodInput {
    resource_eh: EntryHash,
    resource_def_eh: EntryHash,
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
