import {
  AppAgentClient,
  AppAgentWebsocket,
  CallZomeRequest,
  CallZomeRequestSigned,
} from "@holochain/client";
import { decode } from "@msgpack/msgpack";
import { ProfilesClient } from "@holochain-open-dev/profiles";
import {
  AppletToParentRequest,
  ParentToIframeMessage,
  RenderView,
  InternalGroupAttachmentTypes,
  ParentToWebWorkerMessage,
} from "applet-messages";
import {
  AttachmentType,
  GroupWithApplets,
  WeApplet,
  WeServices,
} from "@lightningrodlabs/we-applet";

async function setupAppletClient(
  appPort: number,
  appletId: string
): Promise<AppAgentClient> {
  const appletClient = await AppAgentWebsocket.connect(
    `ws://localhost:${appPort}`,
    appletId
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
    message.groupsAttachmentTypes
  );
}

async function handleRenderViewMessage(
  appPort: number,
  message: RenderView,
  groupsAttachmentTypes: Array<InternalGroupAttachmentTypes>
) {
  const applet = await fetchApplet();

  const weServices: WeServices = {
    groupsAttachmentTypes: groupsAttachmentTypes.map(
      (groupAttachmentTypes) => ({
        groupInfo: groupAttachmentTypes.groupInfo,
        appletsAttachmentTypes: groupAttachmentTypes.appletsAttachmentTypes.map(
          (appletAttachmentTypes) => {
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
                      groupDnaHash: groupAttachmentTypes.groupDnaHash,
                      appletInstanceHash:
                        appletAttachmentTypes.appletInstanceHash,
                      attachmentType: name,
                      attachToHrl,
                    },
                  }),
              };
            }

            return {
              appletName: appletAttachmentTypes.appletName,
              attachmentTypes,
            };
          }
        ),
      })
    ),
    info: (hrl) =>
      postMessage({
        type: "get-info",
        hrl,
      }),
    openViews: {
      openGroupBlock: (block, context) =>
        postMessage({
          type: "open-view",
          request: {
            type: "group-block",
            block,
            context,
          },
        }),
      openCrossGroupBlock: (block, context) =>
        postMessage({
          type: "open-view",
          request: {
            type: "cross-group-block",
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
      message.info.profilesAppId,
      message.info.profilesRoleName
    );
    let client = await setupAppletClient(appPort, message.info.appletId);

    switch (message.view.type) {
      case "main":
        applet
          .groupViews(client, { profilesClient }, weServices)
          .main(document.body);
        break;
      case "block":
        applet
          .groupViews(client, { profilesClient }, weServices)
          .blocks[message.view.block](document.body, message.view.context);
        break;

      case "entry":
        applet
          .groupViews(client, { profilesClient }, weServices)
          .entries[message.view.role][message.view.zome][
            message.view.entryType
          ].view(document.body, message.view.hrl, message.view.context);
        break;
    }
  } else {
    const groupsWithApplets: GroupWithApplets[] = await Promise.all(
      message.infos.map(async (info) => {
        const appletsClients = await Promise.all(
          info.appletsIds.map((appletId) =>
            setupAppletClient(appPort, appletId)
          )
        );
        const profilesClient = await setupProfilesClient(
          appPort,
          info.profilesAppId,
          info.profilesRoleName
        );

        return {
          appletsClients,
          groupServices: {
            profilesClient,
          },
        };
      })
    );

    switch (message.view.type) {
      case "main":
        applet
          .crossGroupViews(groupsWithApplets, weServices)
          .main(document.body);
        break;
      case "block":
        applet
          .crossGroupViews(groupsWithApplets, weServices)
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
        .groupViews(client!, null as any, null as any)
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
