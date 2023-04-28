import {
  AppAgentClient,
  AppAgentWebsocket,
  CallZomeRequest,
  CallZomeRequestSigned,
  decodeHashFromBase64,
  DnaHash,
  DnaHashB64,
  EntryHash,
} from "@holochain/client";
import { decode } from "@msgpack/msgpack";
import { ProfilesClient } from "@holochain-open-dev/profiles";
import { HoloHashMap } from "@holochain-open-dev/utils";
import {
  AppletToParentRequest,
  RenderView,
  InternalGroupAttachmentTypes,
  InternalAttachmentType,
  ParentToAppletMessage,
} from "applet-messages";
import {
  AppletAttachmentTypes,
  AttachmentType,
  GroupAttachmentTypes,
  GroupWithApplets,
  WeApplet,
  WeServices,
} from "@lightningrodlabs/we-applet";

async function setupAppletClient(
  appPort: number,
  appletInstalledAppId: string
): Promise<AppAgentClient> {
  const appletClient = await AppAgentWebsocket.connect(
    `ws://localhost:${appPort}`,
    appletInstalledAppId
  );

  appletClient.appWebsocket.callZome = appletClient.appWebsocket._requester(
    "call_zome",
    {
      input: async (request) => signZomeCall(request),
      output: (o) => decode(o as any),
    }
  );

  return appletClient;
}

async function setupProfilesClient(
  appPort: number,
  appId: string,
  roleName: string
) {
  const client = await setupAppletClient(appPort, appId);

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
    DnaHashB64,
    InternalGroupAttachmentTypes
  >
) {
  const attachmentTypesByGroup = new HoloHashMap<
    DnaHash,
    GroupAttachmentTypes
  >();

  for (const [groupId, groupAttachmentTypes] of Object.entries(
    internalAttachmentTypesByGroups
  )) {
    const attachmentTypesByApplet = new HoloHashMap<
      EntryHash,
      AppletAttachmentTypes
    >();

    for (const [appletInstanceId, appletAttachmentTypes] of Object.entries(
      groupAttachmentTypes.attachmentTypesByApplet
    )) {
      const attachmentTypes: Record<string, AttachmentType> = {};
      for (const [name, attachmentType] of Object.entries(
        appletAttachmentTypes.attachmentTypes
      )) {
        attachmentTypes[name] = {
          label: attachmentType.label,
          icon_src: attachmentType.icon_src,
          create: (attachToHrl) =>
            postMessage({
              type: "create-attachment",
              request: {
                groupId: decodeHashFromBase64(groupId),
                appletInstanceId: decodeHashFromBase64(appletInstanceId),
                attachmentType: name,
                attachToHrl,
              },
            }),
        };
      }

      attachmentTypesByApplet.set(decodeHashFromBase64(appletInstanceId), {
        appletInstanceName: appletAttachmentTypes.appletInstanceName,
        attachmentTypes,
      });
    }

    attachmentTypesByGroup.set(decodeHashFromBase64(groupId), {
      groupProfile: groupAttachmentTypes.groupProfile,
      attachmentTypesByApplet,
    });
  }

  const weServices: WeServices = {
    attachmentTypesByGroup,
    getEntryInfo: (hrl) =>
      postMessage({
        type: "get-entry-info",
        hrl,
      }),
    openViews: {
      openGroupBlock: (groupId, appletInstanceId, block, context) =>
        postMessage({
          type: "open-view",
          request: {
            type: "group-block",
            groupId,
            appletInstanceId,
            block,
            context,
          },
        }),
      openCrossGroupBlock: (appletId, block, context) =>
        postMessage({
          type: "open-view",
          request: {
            type: "cross-group-block",
            appletId,
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
  };

  if (message.type === "group-view") {
    let profilesClient = await setupProfilesClient(
      appPort,
      message.profilesAppId,
      message.profilesRoleName
    );
    let client = await setupAppletClient(appPort, message.appletInstalledAppId);

    switch (message.view.type) {
      case "main":
        applet
          .groupViews(
            client,
            message.groupId,
            message.appletInstanceId,
            { profilesClient, groupProfile: message.groupProfile },
            weServices
          )
          .main(document.body);
        break;
      case "block":
        applet
          .groupViews(
            client,
            message.groupId,
            message.appletInstanceId,
            { profilesClient, groupProfile: message.groupProfile },
            weServices
          )
          .blocks[message.view.block](document.body, message.view.context);
        break;

      case "entry":
        applet
          .groupViews(
            client,
            message.groupId,
            message.appletInstanceId,
            { profilesClient, groupProfile: message.groupProfile },
            weServices
          )
          .entries[message.view.role][message.view.zome][
            message.view.entryType
          ].view(document.body, message.view.hrl, message.view.context);
        break;
    }
  } else {
    const appletsByGroup: HoloHashMap<DnaHash, GroupWithApplets> =
      new HoloHashMap();

    for (const [groupId, groupWithApplets] of Object.entries(
      message.appletsByGroup
    )) {
      const applets: HoloHashMap<EntryHash, AppAgentClient> = new HoloHashMap();
      for (const [appletId, appletInstalledAppId] of Object.entries(
        groupWithApplets.applets
      )) {
        applets.set(
          decodeHashFromBase64(appletId),
          await setupAppletClient(appPort, appletInstalledAppId)
        );
      }

      appletsByGroup.set(decodeHashFromBase64(groupId), {
        applets,
        groupServices: {
          groupProfile: groupWithApplets.groupProfile,
          profilesClient: await setupProfilesClient(
            appPort,
            groupWithApplets.profilesAppId,
            groupWithApplets.profilesRoleName
          ),
        },
      });
    }

    switch (message.view.type) {
      case "main":
        applet.crossGroupViews(appletsByGroup, weServices).main(document.body);
        break;
      case "block":
        applet
          .crossGroupViews(appletsByGroup, weServices)
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
    client = await setupAppletClient(
      message.appPort,
      message.appletInstalledAppId
    );

  switch (message.request.type) {
    case "render-view":
      return handleRenderViewMessage(
        applet,
        message.appPort,
        message.request.message,
        message.request.attachmentTypesByGroup
      );
    case "get-entry-info":
      return applet!
        .groupViews(
          client!,
          message.request.groupId,
          message.request.appletInstanceId,
          {
            profilesClient: null as any,
            groupProfile: message.request.groupProfile,
          },
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
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    parent.postMessage(m, "*", [channel.port2]);

    channel.port1.onmessage = (m) => resolve(m.data);
  });
}

window.addEventListener("message", async (m) => {
  const result = await handleMessage(m.data);
  // IFrame requests don't need to return anything
  m.ports[0].postMessage(result);
});
