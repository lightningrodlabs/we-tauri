/**
 * Contains the API for applets to make calls to We
 *
 * The API is written to the window object but by applets it will
 * most likely be accessed through the WeClient wrapper.
 *
 * Having the API be defined on the window object creates a decoupling
 * layer that allows to change implementation details or adding new
 * API endpoints without existing applets having to update their UI code
 */

import { ProfilesClient } from "@holochain-open-dev/profiles";
import { EntryHashMap, HoloHashMap } from "@holochain-open-dev/utils";
import { ActionHash, AppAgentClient, AppAgentWebsocket, CallZomeRequest, CallZomeRequestSigned, DnaHash, EntryHash, EntryHashB64, decodeHashFromBase64, encodeHashToBase64 } from "@holochain/client";
import { AttachmentType, Hrl, HrlWithContext, RenderInfo, WeNotification, WeApi } from "@lightningrodlabs/we-applet";
import { decode } from "@msgpack/msgpack";
import { AppletToParentMessage, AppletToParentRequest, IframeConfig, InternalAttachmentType, queryStringToRenderView } from "applet-messages";

declare global {
  interface Window {
    __HC_WE_API__: WeApi
  }
}

export function setupWeApi() {

  window.__HC_WE_API__ = {

    getRenderView: () => internalGetRenderView(),

    getRenderInfo: async () => internalGetRenderInfo(),

    getAttachmentTypes: async () => internalGetAttachmentTypes(),

    appletHash: () => readAppletHash(),

    openAppletMain: async (appletHash: EntryHash) =>
      postMessage({
        type: "open-view",
        request: {
          type: "applet-main",
          appletHash,
        },
      }),

    openAppletBlock: async (appletHash, block: string, context: any) =>
      postMessage({
        type: "open-view",
        request: {
          type: "applet-block",
          appletHash,
          block,
          context,
        },
      }),

    openCrossAppletMain: (appletBundleId: ActionHash) =>
      postMessage({
        type: "open-view",
        request: {
          type: "cross-applet-main",
          appletBundleId,
        },
      }),

    openCrossAppletBlock: (appletBundleId: ActionHash, block: string, context: any) =>
      postMessage({
        type: "open-view",
        request: {
          type: "cross-applet-block",
          appletBundleId,
          block,
          context,
        },
      }),

    openHrl: (hrl: Hrl, context: any) =>
      postMessage({
        type: "open-view",
        request: {
          type: "hrl",
          hrl,
          context,
        },
      }),

    groupProfile: (groupId) =>
      postMessage({
        type: "get-group-profile",
        groupId,
      }),

    appletInfo: (appletHash) =>
      postMessage({
        type: "get-applet-info",
        appletHash,
      }),

    entryInfo: (hrl: Hrl) => postMessage({
      type: "get-entry-info",
      hrl,
    }),

    hrlToClipboard: (hrl: HrlWithContext) =>
      postMessage({
        type: "hrl-to-clipboard",
        hrl,
      }),

    search: (filter: string) =>
      postMessage({
        type: "search",
        filter,
      }),

    userSelectHrl: () =>
      postMessage({
        type: "user-select-hrl",
      }),

    notifyWe: (notifications: Array<WeNotification>) =>
      postMessage({
        type: "notify-we",
        notifications,
      })
  }

}



async function postMessage(request: AppletToParentRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();

    const message: AppletToParentMessage = {
      request,
      appletHash: appletHash(),
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

function appletHash(): EntryHash {
  const urlWithoutProtocol = window.location.href.split("://")[1];
  const appletId = urlWithoutProtocol.split("?")[0].split("/")[0];
  return decodeHashFromBase64(appletId);
}


function internalGetRenderView() {
  if (window.location.search.length === 0) return undefined;
  const queryString = window.location.search.slice(1);
  return queryStringToRenderView(queryString);
}



export async function internalGetRenderInfo(): Promise<RenderInfo> {

  const view = internalGetRenderView();

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

async function internalGetAttachmentTypes() {

  const attachmentTypes = new EntryHashMap<Record<string, AttachmentType>>();

  const internalAttachmentTypesByGroups: Record<
    EntryHashB64,
    Record<string, InternalAttachmentType>
  > = await postMessage({
    type: "get-attachment-types",
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

  return attachmentTypes;
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