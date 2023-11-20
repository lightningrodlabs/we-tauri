import { AppEntryDef, EntryHash } from "@holochain/client";
import { ConfigDimension } from "./dimension";

interface CoreResourceDef {
    resource_name: string,
    base_types: Array<AppEntryDef>,
    installed_app_id: string,
    role_name: string,
    zome_name: string,
}
export type ResourceDef = CoreResourceDef & {
    dimension_ehs: Array<EntryHash>,
}

export type ConfigResourceDef = CoreResourceDef & {
    dimensions: Array<ConfigDimension>,
}

export type ResourceDefEh = EntryHash

export type ResourceEh = EntryHash