import { EntryHash } from "@holochain/client";
import { ConfigCulturalContext } from "./culturalContext";
import { Dimension } from "./dimension";
import { ConfigMethod } from "./method";
import { ConfigResourceType } from "./resourceType";

export interface AppletConfig {
    name: string,
    role_name: string,
    dimensions: {
        [dimensionName: string]: EntryHash,
    },
    resource_types: {
        [resourceTypeName: string]: EntryHash,
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
    resource_types: Array<ConfigResourceType>,
    methods: Array<ConfigMethod>,
    cultural_contexts: Array<ConfigCulturalContext>,
}

export interface CreateAppletConfigInput {
    applet_config_input: AppletConfigInput,
    role_name: string,
}