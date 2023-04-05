import { AppEntryDef, EntryHash } from "@holochain/client";
import { ConfigDimension, Dimension } from "./dimension";

interface CoreResourceDef {
    name: string,
    base_types: Array<AppEntryDef>,
}
export type ResourceDef = CoreResourceDef & {
    dimension_ehs: Array<EntryHash>,
}

export type ConfigResourceDef = CoreResourceDef & {
    dimensions: Array<ConfigDimension>,
}

export type ResourceDefEh = EntryHash

export type ResourceEh = EntryHash