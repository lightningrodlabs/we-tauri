import { ConfigCulturalContext } from "./culturalContext"
import { Dimension, Range } from "./dimension"
import { ConfigMethod } from "./method"
import { ConfigResourceType } from "./resourceType"
import { AgentPubKeyB64 } from "@holochain/client"

type Option<T> = T | null

export interface CommonConfig {
    dimensions: Array<Dimension>,
    // the base_type field in ResourceType needs to be bridged call
    resources: Array<ConfigResourceType>,
    methods: Array<ConfigMethod>,
    contexts: Array<ConfigCulturalContext>,
}

export type RawSensemakerConfig = CommonConfig & {
    neighbourhood: String,
    wizard_version: String,
    config_version: String,
    creator: String,
}

export interface Properties {
    community_activator: AgentPubKeyB64,
    config: Option<RawSensemakerConfig>,
}
