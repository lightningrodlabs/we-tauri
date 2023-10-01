import { ProfilesClient } from "@holochain-open-dev/profiles";
import { EntryHashMap, HoloHashMap, parseHrl } from "@holochain-open-dev/utils";
import { ActionHash, AppAgentClient,AppAgentWebsocket,CallZomeRequest,CallZomeRequestSigned,DnaHash, EntryHash, EntryHashB64, decodeHashFromBase64, encodeHashToBase64 } from "@holochain/client";
import { BlockType, AttachmentType, EntryInfo, Hrl, HrlWithContext, WeNotification, RenderView, RenderInfo, AppletToParentRequest, AppletToParentMessage, InternalAttachmentType, IframeConfig, HrlLocation, ParentToAppletRequest } from "./types";
import { decode } from "@msgpack/msgpack";
import { toUint8Array } from "js-base64";


export class AppletServices {
  constructor() {
    this.search = async () => [],
    this.getAppletAttachmentTypes = async () => ({}),
    this.getBlockTypes = async () => ({}),
    this.getEntryInfo = async (
      _roleName,
      _integrityZomeName,
      _entryType,
      _hrl
    ) => undefined
  }

  search: (searchFilter: string) => Promise<Array<HrlWithContext>>;
  getAppletAttachmentTypes: () => Promise<Record<string, AttachmentType>>;
  getBlockTypes: () => Promise<Record<string, BlockType>>;
  getEntryInfo: (
    roleName,
    integrityZomeName,
    entryType,
    hrl
  ) => Promise<EntryInfo | undefined>;
}


export class WeClient {

  appletHash: EntryHash;

  // TODO make this private but it conflicts with buildHeadlessWeClient in applet-host.ts
  appletServices: AppletServices;

  private constructor(
    appletHash: EntryHash,
  ) {
    this.appletHash = appletHash;
    this.appletServices = new AppletServices();

    // TODO add message handler for ParentToApplet messages
    window.addEventListener("message", async (m) => {
      try {
        const result = await handleMessage(this.appletServices, m.data);
        m.ports[0].postMessage({ type: "success", result });
      } catch (e) {
        m.ports[0].postMessage({ type: "error", error: (e as any).message });
      }
    });

    // add eventlistener for clipboard
    window.addEventListener ("keydown", async (zEvent) => {
      if (zEvent.altKey  &&  zEvent.key === "s") {  // case sensitive
        await postMessage({ type: "toggle-clipboard" })
      }
    });

    postMessage({
      type: "ready",
    });

    console.log("postMessage 'ready' sent.");
  }

  static async connect(requestAttachments = true): Promise<WeClient> {

    console.log("Connecting WeClient...");

    // fetch localStorage for this applet from main window and override localStorage methods
    overrideLocalStorage();
    const localStorageJson: string | null = await postMessage({ type: "get-localStorage" });
    const localStorage = localStorageJson ? JSON.parse(localStorageJson) : null;
    if (localStorageJson) Object.keys(localStorage).forEach(
      (key) => window.localStorage.setItem(key, localStorage[key])
    );

    console.log("Overwrote localStorage");

    const appletHash = readAppletHash();

    console.log("Read appletHash: ", encodeHashToBase64(appletHash));

    return new WeClient(appletHash);
  }

  /**
  * Get Attachment types across all installed Applets
  */
  getGlobalAttachmentTypes = async (): Promise<EntryHashMap<Record<string, AttachmentType>>> => {
    return internalGetAttachmentTypes();
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
    type: "get-entry-info",
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

export async function getRenderInfo() {
  return internalGetRenderInfo();
}

const handleMessage = async (appletServices: AppletServices, request: ParentToAppletRequest) => {
  switch (request.type) {
    case "get-entry-info":
      return appletServices.getEntryInfo(
        request.roleName,
        request.integrityZomeName,
        request.entryType,
        request.hrl,
      );

    case "get-applet-attachment-types":
      console.log("@WeClient @handleMessage: got get-applet-attachment-types ParentToAppletRequest");
      return appletServices.getAppletAttachmentTypes();
    case "get-block-types":
      return appletServices.getBlockTypes();
    case "search":
      return appletServices.search(request.filter);
    case "create-attachment":
      throw new Error("Creating attachment not implemented yet.");

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

async function internalGetRenderView() {
  if (window.location.search.length === 0) return undefined;
  const queryString = window.location.search.slice(1);
  return queryStringToRenderView(queryString);
}


export async function internalGetRenderInfo(): Promise<RenderInfo> {

  const view = await internalGetRenderView();

  console.log("GOT VIEW: ", view);

  if (!view) {
    throw new Error("RenderView undefined.");
  }

  const crossApplet = view ? view.type === "cross-applet-view" : false;

  const iframeConfig: IframeConfig = await postMessage({
    type: "get-iframe-config",
    crossApplet,
  });

  console.log("@internalGetRenderInfo: GOT IFRAME CONFIG: ", iframeConfig);

  if (iframeConfig.type === "not-installed") {
    throw new Error("Applet is not installed.");
  }

  if (view.type === "applet-view") {
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

    return {
      type: "cross-applet-view",
      view: view.view,
      applets,
    }

  } else {
    throw new Error("Bad RenderView type.");
  }

}



async function internalGetAttachmentTypes() {
  console.log("@internalGetAttachmentTypes");
  const attachmentTypes = new EntryHashMap<Record<string, AttachmentType>>();

  const internalAttachmentTypesByGroups: Record<
    EntryHashB64,
    Record<string, InternalAttachmentType>
  > = await postMessage({
    type: "get-global-attachment-types",
  });


  console.log("got attachment types by group: ", internalAttachmentTypesByGroups);

  for (const [appletId, appletAttachmentTypes] of Object.entries(
    internalAttachmentTypesByGroups
  )) {
    const attachmentTypesForThisApplet: Record<string, AttachmentType> = {};
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

  const view = args[0].split("=")[1] as "applet-view" | "cross-applet-view";
  const viewType = args[1].split("=")[1];
  let block: string | undefined;
  let hrl: Hrl | undefined;
  let context: any | undefined;

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
    case "main":
      return {
        type: view,
        view: {
          type: "main"
        }
      }
    case "block":
      if (!block) throw new Error(`Invalid query string: ${s}. Missing block name.`);
      return {
        type: view,
        view: {
          type: "block",
          block,
          context,
        }
      }
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