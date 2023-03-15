import { EntryHash } from "@holochain/client";
import { ConfigCulturalContext } from "./culturalContext";
import { ConfigDimension, Dimension } from "./dimension";
import { ConfigMethod } from "./method";
import { ConfigResourceDef } from "./resourceDef";
import { Range } from "./range";

export interface AppletConfig {
    name: string,
    role_name: string,
    ranges: {
        [rangeName: string]: EntryHash,
    },
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
    ranges: Array<Range>,
    dimensions: Array<ConfigDimension>,
    resource_defs: Array<ConfigResourceDef>,
    methods: Array<ConfigMethod>,
    cultural_contexts: Array<ConfigCulturalContext>,
}

export interface CreateAppletConfigInput {
    applet_config_input: AppletConfigInput,
    role_name: string,
}