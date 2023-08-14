import { ProfilesStore } from "@holochain-open-dev/profiles";
import {
  AdminWebsocket,
  AppWebsocket,
  AppInfo,
  AppAgentClient,
  EntryHash,
} from "@holochain/client";
import { AppletConfig, AppletConfigInput, CreateAppletConfigInput, SensemakerStore } from "@neighbourhoods/client";

export type Renderer = (
  rootElement: HTMLElement,
  registry: CustomElementRegistry
) => void;

export interface AppletBlock {
  name: string;
  render: Renderer;
}

export type ResourceView = (
  rootElement: HTMLElement,
  resourceHash: EntryHash,
) => void;

export interface AppletRenderers {
  full: Renderer;
  resourceRenderers: {
    [resourceDefName: string]: ResourceView;
  }
}

export interface NeighbourhoodServices {
  profilesStore?: ProfilesStore;  // in case of cross-we renderers the profilesStore may not be required
  sensemakerStore?: SensemakerStore;
}

export interface NeighbourhoodApplet {
  appletRenderers: (
    appAgentWebsocket: AppAgentClient,
    neighbourhoodStore: NeighbourhoodServices,
    appletInfo: AppletInfo[],
  ) => Promise<AppletRenderers>;
  appletConfig: CreateAppletConfigInput;
  widgetPairs: {
    assess: any,
    display: any,
    compatibleDimension: string[],
  }[]
}


export interface NeighbourhoodInfo {
  logoSrc: string;
  name: string;
}
export interface AppletInfo {
  neighbourhoodInfo: NeighbourhoodInfo,
  appInfo: AppInfo,
}

// componentStore.getViews(resourceEntryHash, resourceDefEh).{view-type} => html``
// appletRenderers[${appletName}].

// need a way to map from the resourceDefEh to get the right resource renderer

/*
{
  [resourceDefEh: EntryHash]: ResourceView
}

*/

