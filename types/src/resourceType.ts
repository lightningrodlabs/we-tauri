import { AppEntryDef, EntryHash } from "@holochain/client";
import { Dimension } from "./dimension";

interface CoreResourceDef {
    name: string,
    base_types: Array<AppEntryDef>,
}
export type ResourceDef = CoreResourceDef & {
    dimension_ehs: Array<EntryHash>,
}

export type ConfigResourceDef = CoreResourceDef & {
    dimensions: Array<Dimension>,
}