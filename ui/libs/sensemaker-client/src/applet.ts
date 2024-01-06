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

/**
 * Applet config as it exists in the SensemakerStore
 */
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

/**
 * Applet config as written by the applet developer
 */
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
 * The resource renderer interface.
 *
 * Technically, if we knew what zome call correpsonded to which reading of a
 * resource, we could create a delegate that only allowed minimal access.
 *
 * TODO: we could extend the applet interface to allow creating a resource reader
 * delegates for each resource type which could be sent to each resource renderer
 * to ensure the code doesn't do anything malicious with the AppAgentClient.
 *
 * Although, if we switch to using a schema based store per context, then this
 * doesn't matter since each applet just needs to provide the required schemas
 * and the CA manages which contexts have which resources that and the permissions
 * of the user would determine access to the context.
 */
export interface ResourceBlockDelegate {
  appAgentWebsocket: AppAgentClient,
  appInfo: AppInfo
  neighbourhoodInfo: NeighbourhoodInfo,
}

/**
 * The interface currently exposed to an application for full screen app blocks
 *
 * TODO: As mentioned above, we could create delegates for each resource provider
 * to ensure that the applet views don't have direct access to the AppAgentClient.
 */
export interface AppBlockDelegate {
  appAgentWebsocket: AppAgentClient
  appInfo: AppInfo,
  neighbourhoodInfo: NeighbourhoodInfo,
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

export interface NeighbourhoodAppletRenderers {
  appletRenderers?: AppletRenderers;
  resourceRenderers?: ResourceRenderers;
  assessmentWidgets?: AssessmentWidgetRenderers;
}
