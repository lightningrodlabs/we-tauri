import { AppEntryDef, EntryHash } from "@holochain/client";
import { Dimension } from "./dimension";

interface CoreResourceType {
    name: string,
    base_types: Array<AppEntryDef>,
}
export type ResourceType = CoreResourceType & {
    dimension_ehs: Array<EntryHash>,
}

export type ConfigResourceType = CoreResourceType & {
    dimensions: Array<Dimension>,
}