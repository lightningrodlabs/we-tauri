import { ProfilesClient } from "@holochain-open-dev/profiles";
import { EntryHashMap, HoloHashMap, parseHrl } from "@holochain-open-dev/utils";
import { ActionHash, AppAgentClient,AppAgentWebsocket,CallZomeRequest,CallZomeRequestSigned, EntryHash, EntryHashB64, RoleName, ZomeName, decodeHashFromBase64, encodeHashToBase64 } from "@holochain/client";
import { BlockType, AttachmentType, EntryInfo, Hrl, HrlWithContext, WeNotification, RenderView, RenderInfo, AppletToParentRequest, AppletToParentMessage, InternalAttachmentType, IframeConfig, HrlLocation, ParentToAppletRequest, AttachmentName, BlockName, AppletHash, AppletInfo, EntryLocationAndInfo, AppletId } from "./types";
import { decode } from "@msgpack/msgpack";
import { toUint8Array } from "js-base64";


export class AppletServices {
  constructor() {
    this.attachmentTypes = async (_appletClient) => ({}),
    this.blockTypes = {},
    this.search = async (_appletClient, _searchFilter) => [],
    this.getEntryInfo = async (
      _appletClient,
      _integrityZomeName,
      _entryType,
      _hrl
    ) => undefined
  }

  /**
   * Attachment types that this Applet offers for other Applets to attach
   */
  attachmentTypes: (appletClient: AppAgentClient) => Promise<Record<AttachmentName, AttachmentType>>;
  /**
   * Render block types that this Applet offers
   */
  blockTypes: Record<BlockName, BlockType>;
  /**
   * Get info about the specified entry of this Applet
   */
  getEntryInfo: (
    appletClient: AppAgentClient,
    roleName: RoleName,
    integrityZomeName: ZomeName,
    entryType: string,
    hrl: Hrl,
  ) => Promise<EntryInfo | undefined>;
  /**
   * Search in this Applet
   */
  search: (appletClient: AppAgentClient, searchFilter: string) => Promise<Array<HrlWithContext>>;
}

export interface WeServices {
  /**
   * Available attachment types across all We Applets
   * @returns
   */
  attachmentTypes: ReadonlyMap<AppletHash, Record<AttachmentName, AttachmentType>>;
  /**
   * Open the main view of the specified Applet
   * @param appletHash
   * @returns
   */
  openAppletMain: (appletHash: EntryHash) => Promise<void>;
  /**
   * Open the specified block view of the specified Applet
   * @param appletHash
   * @param block
   * @param context
   * @returns
   */
  openAppletBlock: (appletHash, block: string, context: any) => Promise<void>;
  /**
   * Open the cross-applet main view of the specified Applet Type.
   * @param appletBundleId
   * @returns
   */
  openCrossAppletMain: (appletBundleId: ActionHash) => Promise<void>;
  /**
   * Open the specified block view of the specified Applet Type
   * @param appletBundleId
   * @param block
   * @param context
   * @returns
   */
  openCrossAppletBlock: (appletBundleId: ActionHash, block: string, context: any) => Promise<void>;
  /**
   * Open the specified HRL as an entry view
   * @param hrl
   * @param context
   * @returns
   */
  openHrl: (hrl: Hrl, context: any) => Promise<void>;
  /**
   * Get the group profile of the specified group
   * @param groupId
   * @returns
   */
  groupProfile: (groupId) => Promise<any>;
  /**
   * Returns Applet info of the specified Applet
   * @param appletHash
   * @returns
   */
  appletInfo: (appletHash) => Promise<AppletInfo | undefined>;
  /**
   * Gets information about an entry in any other Applet in We
   * @param hrl
   * @returns
   */
  entryInfo: (hrl: Hrl) => Promise<EntryLocationAndInfo | undefined>;
  /**
   * Adds the specified HRL to the We-internal clipboard
   * @param hrl
   * @returns
   */
  hrlToClipboard: (hrl: HrlWithContext) => Promise<void>;
  /**
   * Searching across all We Applets
   * @param searchFilter
   * @returns
   */
  search: (searchFilter: string) => Promise<any>;
  /**
   * Prompts the user with the search bar and We clipboard to select an HRL.
   * Returns an HrlWithContex as soon as the usser has selected an HRL
   * or undefined if the user cancels the selection process.
   * @returns
   */
  userSelectHrl: () => Promise<HrlWithContext | undefined>;
  /**
   * Sends notifications to We and depending on user settings and urgency level
   * further to the operating system.
   * @param notifications
   * @returns
   */
  notifyWe: (notifications: Array<WeNotification>) => Promise<any>;
}


export class WeClient implements WeServices {

  appletHash: EntryHash;
  renderInfo: RenderInfo;
  attachmentTypes: ReadonlyMap<AppletHash, Record<AttachmentName, AttachmentType>>;

  private constructor(
    appletHash: EntryHash,
    renderInfo: RenderInfo,
    attachmentTypes: ReadonlyMap<AppletHash, Record<AttachmentName, AttachmentType>>,
  ) {
    this.appletHash = appletHash;
    this.renderInfo = renderInfo;
    this.attachmentTypes = attachmentTypes;
  }

  static async connect(appletServices?: AppletServices): Promise<WeClient> {

    // fetch localStorage for this applet from main window and override localStorage methods
    overrideLocalStorage();
    const localStorageJson: string | null = await postMessage({ type: "get-localStorage" });
    const localStorage = localStorageJson ? JSON.parse(localStorageJson) : null;
    if (localStorageJson) Object.keys(localStorage).forEach(
      (key) => window.localStorage.setItem(key, localStorage[key])
    );

    const appletHash = readAppletHash();

    // create RenderInfo based on renderView.type and in case of type "background-service", add event listener for messages
    const renderInfo = await renderViewSetup(appletServices);

    // get attachment types across all Applets
    const globalAttachmentTypes = await getGlobalAttachmentTypes();

    return new WeClient(appletHash, renderInfo, globalAttachmentTypes);
  }


  openAppletMain = async (appletHash: EntryHash): Promise<void> =>
    postMessage({
      type: "open-view",
      request: {
        type: "applet-main",
        appletHash,
      },
    });

  openAppletBlock = async (appletHash, block: string, context: any): Promise<void> =>
    postMessage({
      type: "open-view",
      request: {
        type: "applet-block",
        appletHash,
        block,
        context,
      },
    });

  openCrossAppletMain = (appletBundleId: ActionHash): Promise<void> =>
    postMessage({
      type: "open-view",
      request: {
        type: "cross-applet-main",
        appletBundleId,
      },
    });

  openCrossAppletBlock = (appletBundleId: ActionHash, block: string, context: any): Promise<void> =>
    postMessage({
      type: "open-view",
      request: {
        type: "cross-applet-block",
        appletBundleId,
        block,
        context,
      },
    });

  openHrl = (hrl: Hrl, context: any): Promise<void> =>
    postMessage({
      type: "open-view",
      request: {
        type: "hrl",
        hrl,
        context,
      },
    });

  groupProfile = (groupId) =>
    postMessage({
      type: "get-group-profile",
      groupId,
    });

  appletInfo = (appletHash) =>
    postMessage({
      type: "get-applet-info",
      appletHash,
    });

  entryInfo = (hrl: Hrl) => postMessage({
    type: "get-global-entry-info",
    hrl,
  });

  hrlToClipboard = (hrl: HrlWithContext) =>
    postMessage({
      type: "hrl-to-clipboard",
      hrl,
    });

  search = (filter: string) =>
    postMessage({
      type: "search",
      filter,
    });

  userSelectHrl = () =>
    postMessage({
      type: "user-select-hrl",
    });

  notifyWe = (notifications: Array<WeNotification>) =>
    postMessage({
      type: "notify-we",
      notifications,
    });
}

const handleMessage = async (appletClient: AppAgentClient, appletServices: AppletServices, request: ParentToAppletRequest) => {
  switch (request.type) {
    case "get-applet-entry-info":
      return appletServices.getEntryInfo(
        appletClient,
        request.roleName,
        request.integrityZomeName,
        request.entryType,
        request.hrl,
      );
    case "get-applet-attachment-types":
      return appletServices.attachmentTypes(appletClient);
    case "get-block-types":
      return appletServices.blockTypes;
    case "search":
      return appletServices.search(appletClient, request.filter);
    case "create-attachment":
      return appletServices.attachmentTypes(appletClient)[request.attachmentType].create(request.attachToHrl);
    default:
      throw new Error("Unknown ParentToAppletRequest");
  }
}


async function postMessage(request: AppletToParentRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();

    const message: AppletToParentMessage = {
      request,
      appletHash: readAppletHash(),
    };

    // eslint-disable-next-line no-restricted-globals
    top!.postMessage(message, "*", [channel.port2]);

    channel.port1.onmessage = (m) => {
      if (m.data.type === "success") {
        resolve(m.data.result);
      } else if (m.data.type === "error") {
        reject(m.data.error);
      }
    };
  });
}



async function setupAppAgentClient(appPort: number, installedAppId: string) {

  const appletClient = await AppAgentWebsocket.connect(
    new URL(`ws://localhost:${appPort}`),
    installedAppId
  );

  window.addEventListener('beforeunload', () => {
    // close websocket connection again to prevent insufficient resources error
    appletClient.appWebsocket.client.close();
  })

  appletClient.appWebsocket.callZome = appletClient.appWebsocket._requester(
    "call_zome",
    {
      input: async (request) => signZomeCall(request),
      output: (o) => decode(o as any),
    }
  );

  return appletClient;
}

async function setupAppletClient(
  appPort: number,
  appletHash: EntryHash,
): Promise<AppAgentClient> {
  return setupAppAgentClient(appPort, appIdFromAppletHash(appletHash));
}

async function setupProfilesClient(
  appPort: number,
  appId: string,
  roleName: string
) {
  const client = await setupAppAgentClient(appPort, appId);

  return new ProfilesClient(client, roleName);
}

async function signZomeCall(
  request: CallZomeRequest
): Promise<CallZomeRequestSigned> {
  return postMessage({ type: "sign-zome-call", request });
}

function readAppletHash(): EntryHash {
  const urlWithoutProtocol = window.location.href.split("://")[1];
  const appletId = urlWithoutProtocol.split("?")[0].split("/")[0];
  return decodeHashFromBase64(appletId);
}

function appIdFromAppletHash(appletHash: EntryHash): string {
  return `applet#${encodeHashToBase64(appletHash)}`
}

async function getRenderView(): Promise<RenderView | undefined> {
  if (window.location.search.length === 0) return undefined;
  const queryString = window.location.search.slice(1);
  return queryStringToRenderView(queryString);
}

/**
 * Sets up appletClient, profilesClient and message event handlers etc. depending
 * on the RenderView
 *
 * @returns
 */
async function renderViewSetup(appletServices?: AppletServices): Promise<RenderInfo> {

  const view = await getRenderView();

  if (!view) {
    throw new Error("RenderView undefined.");
  }

  const crossApplet = view ? view.type === "cross-applet-view" : false;

  const iframeConfig: IframeConfig = await postMessage({
    type: "get-iframe-config",
    crossApplet,
  });

  if (iframeConfig.type === "not-installed") {
    throw new Error("Applet is not installed.");
  }

  if (view.type === "background-service") {
    if (iframeConfig.type !== "applet") throw new Error("Bad iframe config");
    const profilesClient = await setupProfilesClient(
      iframeConfig.appPort,
      iframeConfig.profilesLocation.profilesAppId,
      iframeConfig.profilesLocation.profilesRoleName
    );
    const appletClient = await setupAppletClient(
      iframeConfig.appPort,
      iframeConfig.appletHash
    );

    // message handler for ParentToApplet messages - Only added for background-service iframes
    window.addEventListener("message", async (m: MessageEvent<any>) => {
      try {
        const result = await handleMessage(appletClient, appletServices ? appletServices : new AppletServices(), m.data);
        m.ports[0].postMessage({ type: "success", result });
      } catch (e) {
        m.ports[0].postMessage({ type: "error", error: (e as any).message });
      }
    });

    // Send message to AppletHost that background-service is ready and listening
    await postMessage({
      type: "ready",
    });

    // return dummy "applet-view" RenderInfo for the sake of keeping the applet-facing API clean, i.e.
    // such that RenderInfo only contains "applet-view" and "cross-applet-view" but not "background-services"
    return {
      type: "applet-view",
      view: { type: "main" },
      appletClient,
      profilesClient,
    }
  } else if (view.type === "applet-view") {
    if (iframeConfig.type !== "applet") throw new Error("Bad iframe config");

    const profilesClient = await setupProfilesClient(
      iframeConfig.appPort,
      iframeConfig.profilesLocation.profilesAppId,
      iframeConfig.profilesLocation.profilesRoleName
    );
    const appletClient = await setupAppletClient(
      iframeConfig.appPort,
      iframeConfig.appletHash
    );

    // add eventlistener for clipboard
    window.addEventListener ("keydown", async (zEvent) => {
      if (zEvent.altKey  &&  zEvent.key === "s") {  // case sensitive
        await postMessage({ type: "toggle-clipboard" })
      }
    });

    return {
      type: "applet-view",
      view: view.view,
      appletClient,
      profilesClient,
    }
  } else if (view.type === "cross-applet-view") {

    const applets: EntryHashMap<{
      appletClient: AppAgentClient;
      profilesClient: ProfilesClient;
    }> = new HoloHashMap();

    if (iframeConfig.type !== "cross-applet")
      throw new Error("Bad iframe config");

    for (const [
      appletId,
      { profilesAppId, profilesRoleName },
    ] of Object.entries(iframeConfig.applets)) {
      applets.set(decodeHashFromBase64(appletId), {
        appletClient: await setupAppletClient(
          iframeConfig.appPort,
          decodeHashFromBase64(appletId)
        ),
        profilesClient: await setupProfilesClient(
          iframeConfig.appPort,
          profilesAppId,
          profilesRoleName
        ),
      });
    }

    // add eventlistener for clipboard
    window.addEventListener ("keydown", async (zEvent) => {
      if (zEvent.altKey  &&  zEvent.key === "s") {  // case sensitive
        await postMessage({ type: "toggle-clipboard" })
      }
    });

    return {
      type: "cross-applet-view",
      view: view.view,
      applets,
    }
  } else {
    throw new Error("Bad RenderView type.");
  }
}



async function getGlobalAttachmentTypes() {
  console.log("@getGlobalAttachmentTypes");
  const attachmentTypes = new HoloHashMap<AppletHash, Record<AttachmentName, AttachmentType>>();

  const internalAttachmentTypes: Record<
    AppletId,
    Record<AttachmentName, InternalAttachmentType>
  > = await postMessage({
    type: "get-global-attachment-types",
  });


  console.log("got attachment types by group: ", internalAttachmentTypes);

  for (const [appletId, appletAttachmentTypes] of Object.entries(
    internalAttachmentTypes
  )) {
    const attachmentTypesForThisApplet: Record<AttachmentName, AttachmentType> = {};
    for (const [name, attachmentType] of Object.entries(
      appletAttachmentTypes
    )) {
      attachmentTypesForThisApplet[name] = {
        label: attachmentType.label,
        icon_src: attachmentType.icon_src,
        create: (attachToHrl) =>
          postMessage({
            type: "create-attachment",
            request: {
              appletHash: decodeHashFromBase64(appletId),
              attachmentType: name,
              attachToHrl,
            },
          }),
      };
    }

    attachmentTypes.set(
      decodeHashFromBase64(appletId),
      attachmentTypesForThisApplet
    );
  }

  return attachmentTypes;
}


export async function queryStringToRenderView(s: string): Promise<RenderView> {
  const args = s.split("&");

  const view = args[0].split("=")[1] as "applet-view" | "cross-applet-view" | "background-service";
  let viewType: string | undefined;
  let block: string | undefined;
  let hrl: Hrl | undefined;
  let context: any | undefined;

  if (args[1]) {
    viewType = args[1].split("=")[1];
  }

  if (args[2] && args[2].split("=")[0] === "block") {
    block = args[2].split("=")[1];
  }
  if (args[2] && args[2].split("=")[0] === "hrl") {
    hrl = parseHrl(args[2].split("=")[1]);
  }
  if (args[3] && args[3].split("=")[0] === "context") {
    context = decode(toUint8Array(args[3].split("=")[1]));
  }

  switch (viewType) {
    case undefined:
      if (view !== "background-service") {
        throw new Error("view is undefined");
      }
      return {
        type: view,
        view: null,
      }
    case "main":
      if (view !== "applet-view" && view !== "cross-applet-view") {
        throw new Error(`invalid query string: ${s}.`);
      }
      return {
        type: view,
        view: {
          type: "main"
        }
      };
    case "block":
      if (view !== "applet-view" && view !== "cross-applet-view") {
        throw new Error(`invalid query string: ${s}.`);
      }
      if (!block) throw new Error(`Invalid query string: ${s}. Missing block name.`);
      return {
        type: view,
        view: {
          type: "block",
          block,
          context,
        }
      };
    case "entry":
      if (!hrl) throw new Error(`Invalid query string: ${s}. Missing hrl parameter.`);
      if (view !== "applet-view") throw new Error(`Invalid query string: ${s}.`);
      const hrlLocation: HrlLocation = await postMessage({
        type: "get-hrl-location",
        hrl,
      });
      return {
        type: view,
        view: {
          type: "entry",
          roleName: hrlLocation.roleName,
          integrityZomeName: hrlLocation.integrityZomeName,
          entryType: hrlLocation.entryType,
          hrl,
          context,
        }
      }

    default:
      throw new Error(`Invalid query string: ${s}`);
  }
}


function overrideLocalStorage(): void {
  const _setItem = Storage.prototype.setItem;
  Storage.prototype.setItem = async function(key, value) {
    if (this === window.localStorage) {
      setTimeout(async () => postMessage({
        type: "localStorage.setItem",
        key,
        value,
      }), 100);
    }
    _setItem.apply(this, [key, value]);
  }

  const _removeItem = Storage.prototype.removeItem;
  Storage.prototype.removeItem = async function(key): Promise<void> {
    if (this === window.localStorage) {
      setTimeout(async () => postMessage({
        type: "localStorage.removeItem",
        key,
      }), 100);
    }
    _removeItem.apply(this, [key]);
  }

  const _clear = Storage.prototype.clear;
  Storage.prototype.clear = async function(): Promise<void> {
    if (this === window.localStorage) {
      setTimeout(async () => postMessage({
        type: "localStorage.clear",
      }), 100);
    }
    _clear.apply(this, []);
  }
}