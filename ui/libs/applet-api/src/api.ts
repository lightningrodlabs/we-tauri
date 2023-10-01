import { ProfilesClient } from "@holochain-open-dev/profiles";
import { EntryHashMap, HoloHashMap } from "@holochain-open-dev/utils";
import { ActionHash, AppAgentClient, AppAgentWebsocket, CallZomeRequest, CallZomeRequestSigned, DnaHash, EntryHash, EntryHashB64, decodeHashFromBase64, encodeHashToBase64 } from "@holochain/client";
import { AppletClients, AppletInfo, AttachmentType, EntryInfo, EntryLocationAndInfo, GroupProfile, Hrl, HrlWithContext, WeNotification } from "@lightningrodlabs/we-applet";
import { decode } from "@msgpack/msgpack";
import { AppletToParentMessage, AppletToParentRequest, AppletView, BlockType, CrossAppletView, IframeConfig, InternalAttachmentType, RenderView, queryStringToRenderView } from "applet-messages";


declare global {
  interface Window {
    __HC_WE_API__: WeApi
  }
}


export interface WeApi {
  getRenderView(): RenderView | undefined;
  openAppletMain(appletHash: EntryHash): void;
  openAppletBlock(appletHash: EntryHash, block: string, context: any): void;
  openHrl(hrl: Hrl, context: any): void;
  openCrossAppletMain(appletBundleId: ActionHash): void;
  openCrossAppletBlock(
    appletBundleId: ActionHash,
    block: string,
    context: any
  ): void;
  groupProfile(groupId: DnaHash): Promise<GroupProfile | undefined>;
  appletInfo(appletHash: EntryHash): Promise<AppletInfo | undefined>;
  entryInfo(hrl: Hrl): Promise<EntryLocationAndInfo | undefined>;
  search(filter: string): Promise<Array<HrlWithContext>>;
  hrlToClipboard(hrl: HrlWithContext): Promise<void>;
  userSelectHrl(): Promise<HrlWithContext | undefined>;
  notifyWe(notifications: Array<WeNotification>): Promise<void>;
};

// asdfasf asdfas fdsa fdsa efafd fadf afa


// import { getAppletClient, getProfilesClient, WeClient, setupAppletServices, AppletServices } from '@lightningrodlabs/we-applet';




// let weClient = WeClient.connect();



export interface AppletServices {
  attachmentTypes: () => Promise<Record<string, AttachmentType>>;
  search: (searchFilter: string) => Promise<Array<HrlWithContext>>;
  getBlockTypes: () => Promise<Record<string, BlockType>>;
  getEntryInfo: (
    roleName,
    integrityZomeName,
    entryType,
    hrl
  ) => Promise<EntryInfo | undefined>;
}


export type RenderInfo = {
  type: "applet-view",
  view: AppletView,
  appletClient: AppAgentClient,
  profilesClient: ProfilesClient,
} | {
  type: "cross-applet-view",
  view: CrossAppletView,
  applets: ReadonlyMap<EntryHash, AppletClients>,
}

export async function getRenderInfo(): Promise<RenderInfo> {

  const view = getRenderView();

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

export class WeClient {

  appletHash: EntryHash;
  attachmentTypes: ReadonlyMap<EntryHash, Record<string, AttachmentType>>;

  private constructor(
    appletHash: EntryHash,
    attachmentTypes: ReadonlyMap<EntryHash, Record<string, AttachmentType>> // Segmented by groupId
  ) {
    this.appletHash = appletHash;
    this.attachmentTypes = attachmentTypes;
  }

  static async connect(requestAttachments = true): Promise<WeClient> {

    const attachmentTypes = new HoloHashMap<
      EntryHash,
      Record<string, AttachmentType>
    >();

    if (requestAttachments) {
      const internalAttachmentTypesByGroups: Record<
        EntryHashB64,
        Record<string, InternalAttachmentType>
      > = await postMessage({
        type: "get-global-attachment-types",
      });

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
    }

    const appletHash = readAppletHash();

    return new WeClient(appletHash, attachmentTypes);
  }

  openAppletMain = (appletHash: EntryHash) => window.__HC_WE_API__.openAppletMain(appletHash);

  openAppletBlock = (appletHash, block: string, context: any) => window.__HC_WE_API__.openAppletBlock(appletHash, block, context);

  openHrl = (hrl: Hrl, context: any) => window.__HC_WE_API__.openHrl(hrl, context);

  openCrossAppletMain = (appletBundleId: ActionHash) => window.__HC_WE_API__.openCrossAppletMain(appletBundleId);

  openCrossAppletBlock = (appletBundleId: ActionHash, block: string, context: any) => window.__HC_WE_API__.openCrossAppletBlock(appletBundleId, block, context);

  groupProfile = async (groupId: DnaHash) => window.__HC_WE_API__.groupProfile(groupId);

  appletInfo = async (appletHash: EntryHash) => window.__HC_WE_API__.appletInfo(appletHash);

  entryInfo = async (hrl: Hrl) => window.__HC_WE_API__.entryInfo(hrl);

  hrlToClipboard = (hrl: HrlWithContext) => window.__HC_WE_API__.hrlToClipboard(hrl);

  search = async (filter: string) => window.__HC_WE_API__.search(filter);

  userSelectHrl = async () => window.__HC_WE_API__.userSelectHrl();

  notifyWe = (notifications: Array<WeNotification>) => window.__HC_WE_API__.notifyWe(notifications);
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

function getRenderView(): RenderView | undefined {
  if (window.location.search.length === 0) return undefined;
  const queryString = window.location.search.slice(1);
  return queryStringToRenderView(queryString);
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