import {
  AppAgentClient,
  AppAgentWebsocket,
  CallZomeRequest,
  CallZomeRequestSigned,
  decodeHashFromBase64,
  encodeHashToBase64,
  EntryHash,
  EntryHashB64,
} from "@holochain/client";
import { ProfilesClient } from "@holochain-open-dev/profiles";
import { EntryHashMap, HoloHashMap } from "@holochain-open-dev/utils";
import {
  AppletToParentRequest,
  RenderView,
  InternalAttachmentType,
  IframeConfig,
  BlockType,
  ParentToAppletRequest,
  HrlLocation,
  queryStringToRenderView,
  AppletToParentMessage,
} from "applet-messages";
import {
  AttachmentType,
  HrlWithContext,
  WeApplet,
  WeNotification,
  WeServices,
} from "@lightningrodlabs/we-applet";
import { decode } from "@msgpack/msgpack";
import { setupWeApi } from "./applet-api.js";


export * from './applet-api.js';

function renderNotInstalled(appletName: string) {
  document.body.innerHTML = `<div
    style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center"
  >
    <span>You don't have the applet ${appletName} installed.</span>
    <span>Install it from the group's home, and refresh this view.</span>
  </div>`;
}

setupWeApi();

window.onload = async () => {
  const view = getRenderView();

  const crossApplet = view ? view.type === "cross-applet-view" : false;

  const iframeConfig: IframeConfig = await postMessage({
    type: "get-iframe-config",
    crossApplet,
  });

  if (iframeConfig.type === "not-installed") {
    renderNotInstalled(iframeConfig.type);
    return;
  }

  // fetch localStorage for this applet from main window and override localStorage methods
  overrideLocalStorage();
  const localStorageJson: string | null = await postMessage({ type: "get-localStorage" });
  const localStorage = localStorageJson ? JSON.parse(localStorageJson) : null;
  if (localStorageJson) Object.keys(localStorage).forEach(
    (key) => window.localStorage.setItem(key, localStorage[key])
  );

  const applet = await fetchApplet();

  if (view) {
    await renderView(applet, iframeConfig, view);
  }

  // add eventlistener for clipboard
  window.addEventListener ("keydown", async (zEvent) => {
    if (zEvent.altKey  &&  zEvent.key === "s") {  // case sensitive
      await postMessage({ type: "toggle-clipboard" })
    }
  });

  window.addEventListener("message", async (m) => {
    try {
      if (iframeConfig.type !== "applet") throw new Error("Bad iframe config");
      const client = await setupAppletClient(iframeConfig.appPort, iframeConfig.appletHash);
      const result = await handleMessage(client, applet, iframeConfig, m.data);
      // close websocket connection again to prevent insufficient resources error
      (client as AppAgentWebsocket).appWebsocket.client.close();
      m.ports[0].postMessage({ type: "success", result });
    } catch (e) {
      m.ports[0].postMessage({ type: "error", error: (e as any).message });
    }
  });

  await postMessage({
    type: "ready",
  });
};

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

async function fetchApplet(): Promise<WeApplet> {
  // @ts-ignore
  // eslint-disable-next-line import/no-absolute-path
  const m = await import("/index.js");

  return m.default;
}

async function buildWeServices(requestAttachments = true): Promise<WeServices> {
  const attachmentTypes = new HoloHashMap<
    EntryHash,
    Record<string, AttachmentType>
  >();
  if (requestAttachments) {
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
  }
  return {
    attachmentTypes,
    openViews: {
      openAppletMain: (appletHash) =>
        postMessage({
          type: "open-view",
          request: {
            type: "applet-main",
            appletHash,
          },
        }),
      openAppletBlock: (appletHash, block, context) =>
        postMessage({
          type: "open-view",
          request: {
            type: "applet-block",
            appletHash,
            block,
            context,
          },
        }),
      openCrossAppletMain: (appletBundleId) =>
        postMessage({
          type: "open-view",
          request: {
            type: "cross-applet-main",
            appletBundleId,
          },
        }),
      openCrossAppletBlock: (appletBundleId, block, context) =>
        postMessage({
          type: "open-view",
          request: {
            type: "cross-applet-block",
            appletBundleId,
            block,
            context,
          },
        }),
      openHrl: (hrl, context) =>
        postMessage({
          type: "open-view",
          request: {
            type: "hrl",
            hrl,
            context,
          },
        }),
    },
    entryInfo: (hrl) =>
      postMessage({
        type: "get-entry-info",
        hrl,
      }),
    appletInfo: (appletHash) =>
      postMessage({
        type: "get-applet-info",
        appletHash,
      }),
    groupProfile: (groupId) =>
      postMessage({
        type: "get-group-profile",
        groupId,
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
  };
}

async function renderView(
  applet: WeApplet,
  iframeConfig: IframeConfig,
  view: RenderView
) {
  const weServices = await buildWeServices();

  if (view.type === "applet-view") {
    if (iframeConfig.type !== "applet") throw new Error("Bad iframe config");

    const profilesClient = await setupProfilesClient(
      iframeConfig.appPort,
      iframeConfig.profilesLocation.profilesAppId,
      iframeConfig.profilesLocation.profilesRoleName
    );
    const client = await setupAppletClient(
      iframeConfig.appPort,
      iframeConfig.appletHash
    );
    switch (view.view.type) {
      case "main":
        (
          await applet.appletViews(
            client,
            iframeConfig.appletHash,
            profilesClient,
            weServices
          )
        ).main(document.body);
        break;
      case "block":
        (
          await applet.appletViews(
            client,
            iframeConfig.appletHash,
            profilesClient,
            weServices
          )
        ).blocks[view.view.block].view(document.body, view.view.context);
        break;

      case "entry":
        const hrlLocation: HrlLocation = await postMessage({
          type: "get-hrl-location",
          hrl: view.view.hrl,
        });
        (
          await applet.appletViews(
            client,
            iframeConfig.appletHash,
            profilesClient,
            weServices
          )
        ).entries[hrlLocation.roleName][hrlLocation.integrityZomeName][
          hrlLocation.entryType
        ].view(document.body, view.view.hrl, view.view.context);
        break;
    }
  } else {
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

    switch (view.view.type) {
      case "main":
        (await applet.crossAppletViews(applets, weServices)).main(
          document.body
        );
        break;
      case "block":
        (await applet.crossAppletViews(applets, weServices)).blocks[
          view.view.block
        ].view(document.body, view.view.context);
        break;
    }
  }
}

async function handleMessage(
  client: AppAgentClient,
  applet: WeApplet,
  iframeConfig: IframeConfig,
  request: ParentToAppletRequest
) {
  if (iframeConfig.type !== "applet") throw new Error("Bad iframe config");

  const appletHash = iframeConfig.appletHash;

  let weServices: WeServices;

  switch (request.type) {
    case "get-entry-info":
      const appletViews = await applet.appletViews(
        client,
        appletHash,
        null as any,
        null as any
      );

      if (!appletViews.entries[request.roleName])
        throw new Error(
          `The requested applet doesn't implement entry views for role ${request.roleName}`
        );
      if (!appletViews.entries[request.roleName][request.integrityZomeName])
        throw new Error(
          `The requested applet doesn't implement entry views for integrity zome ${request.integrityZomeName} in role ${request.roleName}`
        );
      if (
        !appletViews.entries[request.roleName][request.integrityZomeName][
          request.entryDefId
        ]
      )
        throw new Error(
          `The requested applet doesn't implement entry views for entry type ${request.entryDefId} in integrity zome ${request.integrityZomeName} and role ${request.roleName}`
        );

      return appletViews.entries[request.roleName][request.integrityZomeName][
        request.entryDefId
      ].info(request.hrl);
    case "get-attachment-types":
      weServices = await buildWeServices(false);
      const types = await applet.attachmentTypes(
        client,
        appletHash,
        weServices
      );

      const internalAttachmentTypes: Record<string, InternalAttachmentType> =
        {};
      for (const [name, attachmentType] of Object.entries(types)) {
        internalAttachmentTypes[name] = {
          icon_src: attachmentType.icon_src,
          label: attachmentType.label,
        };
      }

      return internalAttachmentTypes;
    case "get-block-types":
      const views = await applet.appletViews(
        client,
        appletHash,
        null as any,
        null as any
      );
      const blocks: Record<string, BlockType> = {};

      for (const [blockName, block] of Object.entries(views.blocks)) {
        blocks[blockName] = {
          label: block.label,
          icon_src: block.icon_src,
        };
      }

      return blocks;
    case "search":
      weServices = await buildWeServices();
      return applet.search(client, appletHash, weServices, request.filter);
    case "create-attachment":
      weServices = await buildWeServices();
      return (await applet.attachmentTypes(client, appletHash, weServices))[
        request.attachmentType
      ].create(request.attachToHrl);
  }
}

async function signZomeCall(
  request: CallZomeRequest
): Promise<CallZomeRequestSigned> {
  return postMessage({ type: "sign-zome-call", request });
}

// <iframe src="applet://asdf" view="applet-main"></iframe>
// <iframe src="applet://asdf" view="applet-block" block="asdf" ></iframe>
// <iframe src="applet://asdf?view=hrl&hrl=hrl://[DNAHASH]/[DHTHASH]" ></iframe>
// <iframe src="applet://asdf" view="applet-main"  ></iframe>
// <iframe src="applet://asdf" view="applet-block" block="asdf" ></iframe>

function getRenderView(): RenderView | undefined {
  if (window.location.search.length === 0) return undefined;

  const queryString = window.location.search.slice(1);

  return queryStringToRenderView(queryString);
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

function appletHash(): EntryHash {
  const urlWithoutProtocol = window.location.href.split("://")[1];
  const appletId = urlWithoutProtocol.split("?")[0].split("/")[0];
  return decodeHashFromBase64(appletId);
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

function appIdFromAppletHash(appletHash: EntryHash): string {
  return `applet#${encodeHashToBase64(appletHash)}`
}