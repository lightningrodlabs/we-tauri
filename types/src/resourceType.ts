import { AppEntryType, EntryHash } from "@holochain/client";
import { Dimension } from "./dimension";

interface CoreResourceType {
    name: string,
    base_types: Array<AppEntryType>,
}
export type ResourceType = CoreResourceType & {
    dimension_ehs: Array<EntryHash>,
}

export type ConfigResourceType = CoreResourceType & {
    dimensions: Array<Dimension>,
}