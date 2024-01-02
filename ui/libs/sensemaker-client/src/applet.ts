import { AppAgentClient, AppInfo, EntryHash } from "@holochain/client";
import { ConfigCulturalContext } from "./culturalContext";
import { ConfigDimension } from "./dimension";
import { ConfigMethod } from "./method";
import { ConfigResourceDef } from "./resourceDef";
import { Range } from "./range";
import { SensemakerStore } from "./sensemakerStore";
import { NHDelegateReceiverConstructor } from "./delegate";
import { AssessmentWidgetRenderers } from "./widget";
import { ProfilesStore } from "@holochain-open-dev/profiles";

/**
 * Logo and name of Neighbourhood
 */
export type NeighbourhoodInfo = {
  logoSrc: string;
  name: string;
}
  
/**
 * Combination of We app info and Neighbourhood info.
 */
export type AppletInfo = {
  neighbourhoodInfo: NeighbourhoodInfo,
  appInfo: AppInfo,
}

export interface AppletConfig {
  name: string,
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
  resource_defs: Array<ConfigResourceDef>,
  // This is going to be changed when we figure out how contexts are configured by the CA
  cultural_contexts: Array<ConfigCulturalContext>,
  // These become suggestions rather than enforced things.
  methods?: Array<ConfigMethod>,
  ranges?: Array<Range>,
  dimensions?: Array<ConfigDimension>,
}

/**
 * Object to track the stores instantiated per applet.
 *
 * TODO: If this is only used in the matrix store, we can move it out of here.
 */
export type NeighbourhoodServices = {
  profilesStore?: ProfilesStore;  // in case of cross-we renderers the profilesStore may not be required
  sensemakerStore?: SensemakerStore;
}

/**
 * The resource renderer interface.
 *
 * Technically, if we knew what zome call correpsonded to which reading of a
 * resource, we could create a delegate that only allowed minimal access.
 *
 * TODO: we could extend the applet interface to allow creating a resource reader
 * delegates for each resource type which could be sent to each resource renderer
 * to ensure the code doesn't do anything malicious with the AppAgentClient.
 */
export interface ResourceBlockDelegate {
  appAgentWebsocket: AppAgentClient
}

/**
 * The interface currently exposed to an application for full screen app blocks
 *
 * TODO: As mentioned above, we could create delegates for each resource provider
 * to ensure that the applet views don't have direct access to the AppAgentClient.
 */
export interface AppBlockDelegate {
  appAgentWebsocket: AppAgentClient
  appletInfo: AppletInfo[]
  sensemakerStore: SensemakerStore
  profileStore: ProfilesStore
}

export type AppletRenderers = Record<string, NHDelegateReceiverConstructor<AppBlockDelegate>>
export type ResourceRenderers = Record<string, NHDelegateReceiverConstructor<ResourceBlockDelegate>>

/**
 * Main interface for applets, allows exporting the config, applet renderers,
 * resource renderers, and assessment widgets.
 */
export interface NeighbourhoodApplet {
  appletConfig: AppletConfigInput;
  appletRenderers: AppletRenderers;
  resourceRenderers: ResourceRenderers;
  assessmentWidgets: AssessmentWidgetRenderers;
}
