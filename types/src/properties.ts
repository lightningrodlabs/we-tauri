import { AgentPubKeyB64 } from "@holochain/client"
import { AppletConfigInput } from "./applet"

export interface SensemakerConfig {
    neighbourhood: string,
    community_activator: AgentPubKeyB64,
    wizard_version: string,
}

export interface Properties {
    sensemaker_config: SensemakerConfig,
    applet_configs: Array<AppletConfigInput>,
}
