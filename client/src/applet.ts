import { EntryHash } from "@holochain/client";
import { ConfigCulturalContext } from "./culturalContext";
import { ConfigDimension } from "./dimension";
import { ConfigMethod } from "./method";
import { ConfigResourceDef } from "./resourceDef";
import { Range } from "./range";
import { ConcreteAssessDimensionWidget, ConcreteDisplayDimensionWidget } from "./widgets/dimension-widget-interface";

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

export interface WidgetMappingConfig {
    [resourceDefEh: string]: {
        activeDimensionEh: string, // the dimension eh
        inputDimensionMapping: {
            [inputDimensionEh: string]: [outputDimensionEh: EntryHash, methodEh: EntryHash], // the dimension eh
        }
  }
}

export interface WidgetRegistry {
    [dimensionEh: string]: {
        display: typeof ConcreteDisplayDimensionWidget,
        assess: typeof ConcreteAssessDimensionWidget,
    }
}

export interface MethodDimensionMap {
    [methodEh: string]: { 
        inputDimensionEh: EntryHash,
        outputDimensionEh: EntryHash,
    },
}