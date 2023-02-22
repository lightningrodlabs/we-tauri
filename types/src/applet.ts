import { EntryHash } from "@holochain/client";
import { ConfigCulturalContext } from "./culturalContext";
import { Dimension } from "./dimension";
import { ConfigMethod } from "./method";
import { ConfigResourceDef } from "./resourceDef";

export interface AppletConfig {
    name: string,
    dimensions: {
        [dimensionName: string]: EntryHash,
    },
    resource_defs: {
        [resourceDefName: string]: EntryHash,
    },
    methods: {
        [methodName: string]: EntryHash,
    },
    cultural_contexts: {
        [contextName: string]: EntryHash,
    }
}

export interface AppletConfigInput {
    name: string,
    dimensions: Array<Dimension>,
    resource_defs: Array<ConfigResourceDef>,
    methods: Array<ConfigMethod>,
    cultural_contexts: Array<ConfigCulturalContext>,
}