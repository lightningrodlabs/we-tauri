import { EntryHash } from "@holochain/client"
import { Range } from "./range"
interface CoreDimension {
    name: string,
    computed: boolean,
}

export type Dimension = CoreDimension & {
    range_eh: EntryHash,
}

export type ConfigDimension = CoreDimension & {
    range: Range
}