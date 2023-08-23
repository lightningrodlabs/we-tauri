import { ProfilesStore } from "@holochain-open-dev/profiles";
import {
  AppInfo,
  AppAgentClient,
  EntryHash,
} from "@holochain/client";
import { AssessDimensionWidget, CreateAppletConfigInput, DisplayDimensionWidget, SensemakerStore } from "@neighbourhoods/client";

export type Renderer = (
  rootElement: HTMLElement,
  registry: CustomElementRegistry
) => void;

export type ResourceView = (
  element: HTMLElement,
  resourceIdentifier: EntryHash,
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
    assess: AssessDimensionWidget,
    display: DisplayDimensionWidget,
    compatibleDimensions: string[],
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
