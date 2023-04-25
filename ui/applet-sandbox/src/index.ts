import {
  AppAgentClient,
  AppAgentWebsocket,
  CallZomeRequest,
  CallZomeRequestSigned,
  DnaHash,
  EntryHash,
} from "@holochain/client";
import { decode } from "@msgpack/msgpack";
import { ProfilesClient } from "@holochain-open-dev/profiles";
import { HoloHashMap } from "@holochain-open-dev/utils";
import {
  AppletToParentRequest,
  ParentToIframeMessage,
  RenderView,
  InternalGroupAttachmentTypes,
  ParentToWebWorkerMessage,
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

async function handleIframeMessage(message: ParentToIframeMessage) {
  handleRenderViewMessage(
    message.appPort,
    message.message,
    message.attachmentTypesByGroup
  );
}

async function handleRenderViewMessage(
  appPort: number,
  message: RenderView,
  internalAttachmentTypesByGroups: HoloHashMap<
    DnaHash,
    InternalGroupAttachmentTypes
  >
) {
  const applet = await fetchApplet();

  const attachmentTypesByGroup = new HoloHashMap<
    DnaHash,
    GroupAttachmentTypes
  >();

  for (const [
    groupId,
    groupAttachmentTypes,
  ] of internalAttachmentTypesByGroups) {
    const attachmentTypesByApplet = new HoloHashMap<
      EntryHash,
      AppletAttachmentTypes
    >();

    for (const [
      appletInstanceId,
      appletAttachmentTypes,
    ] of groupAttachmentTypes.attachmentTypesByApplet) {
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
                groupId: groupId,
                appletInstanceId: appletInstanceId,
                attachmentType: name,
                attachToHrl,
              },
            }),
        };
      }

      attachmentTypesByApplet.set(appletInstanceId, {
        appletName: appletAttachmentTypes.appletName,
        attachmentTypes,
      });
    }

    attachmentTypesByGroup.set(groupId, {
      groupProfile: groupAttachmentTypes.groupProfile,
      attachmentTypesByApplet,
    });
  }

  const weServices: WeServices = {
    attachmentTypesByGroup,
    info: (hrl) =>
      postMessage({
        type: "get-info",
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

    for (const [groupId, groupWithApplets] of Array.from(
      message.appletsByGroup.entries()
    )) {
      const applets: HoloHashMap<EntryHash, AppAgentClient> = new HoloHashMap();
      for (const [appletId, appletInstalledAppId] of groupWithApplets.applets) {
        applets.set(
          appletId,
          await setupAppletClient(appPort, appletInstalledAppId)
        );
      }

      appletsByGroup.set(groupId, {
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
let client: AppAgentClient | undefined = undefined;

async function handleWorkerMessage(message: ParentToWebWorkerMessage) {
  if (!applet) applet = await fetchApplet();

  switch (message.type) {
    case "setup":
      client = await setupAppletClient(message.appPort, message.appletId);
      break;
    case "info":
      return applet
        .groupViews(
          client!,
          message.groupId,
          message.appletInstanceId,
          { profilesClient: null as any, groupProfile: message.groupProfile },
          null as any
        )
        .entries[message.roleName][message.integrityZomeName][
          message.entryDefId
        ].info(message.hrl);
    case "create-attachment":
      return applet
        .attachmentTypes(client!)
        [message.attachmentType].create(message.attachToHrl);
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
    if (isIframe) {
      parent.postMessage(m, "*", [channel.port2]);
    } else {
      self.postMessage(m, "*", [channel.port2]);
    }

    channel.port1.onmessage = (m) => resolve(m.data);
  });
}

const isIframe = window !== undefined && typeof window === "object";

if (isIframe) {
  // This sandbox is inside an iframe
  window.addEventListener("message", async (m) => {
    const result = await handleIframeMessage(m.data);
    // IFrame requests don't need to return anything
    // m.ports[0].postMessage(result);
  });
} else {
  // This sandbox is inside a webworker
  self.onmessage = async (m) => {
    const result = await handleWorkerMessage(m.data);
    m.ports[0].postMessage(result);
  };
}
