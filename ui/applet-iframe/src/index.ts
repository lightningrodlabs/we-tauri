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
  ParentToAppletMessage,
} from "applet-messages";
import {
  AttachmentType,
  WeApplet,
  WeServices,
} from "@lightningrodlabs/we-applet";

async function setupAppAgentClient(appPort: number, installedAppId: string) {
  const appletClient = await AppAgentWebsocket.connect(
    `ws://localhost:${appPort}`,
    installedAppId
  );

  const cz = appletClient.callZome;

  appletClient.callZome = async (request: CallZomeRequest) => {
    const signedRequest = await signZomeCall(request);
    return cz(signedRequest);
  };

  return appletClient;
}

async function setupAppletClient(
  appPort: number,
  appletId: EntryHash
): Promise<AppAgentClient> {
  return setupAppAgentClient(appPort, encodeHashToBase64(appletId));
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
  const js = await import(`/index.js`);

  return js.default as WeApplet;
}

async function handleRenderViewMessage(
  applet: WeApplet,
  appPort: number,
  message: RenderView,
  internalAttachmentTypesByGroups: Record<
    EntryHashB64,
    Record<string, InternalAttachmentType>
  >
) {
  const attachmentTypes = new HoloHashMap<
    EntryHash,
    Record<string, AttachmentType>
  >();

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
              appletId: decodeHashFromBase64(appletId),
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

  const weServices: WeServices = {
    attachmentTypes,
    openViews: {
      openAppletBlock: (appletId, block, context) =>
        postMessage({
          type: "open-view",
          request: {
            type: "applet-block",
            appletId,
            block,
            context,
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
    appletInfo: (appletId) =>
      postMessage({
        type: "get-applet-info",
        appletId,
      }),
    groupProfile: (groupId) =>
      postMessage({
        type: "get-group-profile",
        groupId,
      }),
    search: (filter: string) =>
      postMessage({
        type: "search",
        filter,
      }),
  };

  if (message.type === "applet-view") {
    let profilesClient = await setupProfilesClient(
      appPort,
      message.profilesLocation.profilesAppId,
      message.profilesLocation.profilesRoleName
    );
    let client = await setupAppletClient(appPort, message.appletId);

    switch (message.view.type) {
      case "main":
        applet
          .appletViews(client, message.appletId, profilesClient, weServices)
          .main(document.body);
        break;
      case "block":
        applet
          .appletViews(client, message.appletId, profilesClient, weServices)
          .blocks[message.view.block](document.body, message.view.context);
        break;

      case "entry":
        applet
          .appletViews(client, message.appletId, profilesClient, weServices)
          .entries[message.view.role][message.view.zome][
            message.view.entryType
          ].view(document.body, message.view.hrl, message.view.context);
        break;
    }
  } else {
    const applets: EntryHashMap<{
      appletClient: AppAgentClient;
      profilesClient: ProfilesClient;
    }> = new HoloHashMap();

    for (const [
      appletId,
      { profilesAppId, profilesRoleName },
    ] of Object.entries(message.applets)) {
      applets.set(decodeHashFromBase64(appletId), {
        appletClient: await setupAppletClient(
          appPort,
          decodeHashFromBase64(appletId)
        ),
        profilesClient: await setupProfilesClient(
          appPort,
          profilesAppId,
          profilesRoleName
        ),
      });
    }

    switch (message.view.type) {
      case "main":
        applet.crossAppletViews(applets, weServices).main(document.body);
        break;
      case "block":
        applet
          .crossAppletViews(applets, weServices)
          .blocks[message.view.block](document.body, message.view.context);
        break;
    }
  }
}

let applet: WeApplet | undefined = undefined;
let client: AppAgentClient | undefined;

async function handleMessage(message: ParentToAppletMessage) {
  if (!applet) applet = await fetchApplet();
  if (!client && message.request.type !== "render-view")
    client = await setupAppletClient(message.appPort, message.appletId);

  switch (message.request.type) {
    case "render-view":
      return handleRenderViewMessage(
        applet,
        message.appPort,
        message.request.message,
        message.request.attachmentTypes
      );
    case "get-entry-info":
      return applet!
        .appletViews(
          client!,
          message.request.appletId,
          null as any,
          null as any
        )
        .entries[message.request.roleName][message.request.integrityZomeName][
          message.request.entryDefId
        ].info(message.request.hrl);
    case "get-attachment-types":
      const types = await applet.attachmentTypes(client!);

      const internalAttachmentTypes: Record<string, InternalAttachmentType> =
        {};
      for (const [name, attachmentType] of Object.entries(types)) {
        internalAttachmentTypes[name] = {
          icon_src: attachmentType.icon_src,
          label: attachmentType.label,
        };
      }

      return internalAttachmentTypes;
    case "search":
      return applet!.search(client!, message.request.filter);
    case "create-attachment":
      return (await applet!.attachmentTypes(client!))[
        message.request.attachmentType
      ].create(message.request.attachToHrl);
  }
}

async function signZomeCall(
  request: CallZomeRequest
): Promise<CallZomeRequestSigned> {
  return postMessage({ type: "sign-zome-call", request });
}

async function postMessage(m: AppletToParentRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    parent.postMessage(m, "*", [channel.port2]);

    channel.port1.onmessage = (m) => {
      if (m.data.type === "success") {
        resolve(m.data.result);
      } else if (m.data.type === "error") {
        reject(m.data.error);
      }
    };
  });
}

window.addEventListener("message", async (m) => {
  try {
    const result = await handleMessage(m.data);
    m.ports[0].postMessage({ type: "success", result });
  } catch (e) {
    m.ports[0].postMessage({ type: "error", error: e.message });
  }
});
