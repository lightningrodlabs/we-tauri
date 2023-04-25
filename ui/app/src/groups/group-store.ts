import {
  PeerStatusClient,
  PeerStatusStore,
} from "@holochain-open-dev/peer-status";
import { ProfilesClient, ProfilesStore } from "@holochain-open-dev/profiles";
import {
  asyncDerived,
  AsyncReadable,
  join,
  lazyLoad,
  lazyLoadAndPoll,
} from "@holochain-open-dev/stores";
import { EntryRecord, LazyHoloHashMap } from "@holochain-open-dev/utils";
import { makeStatefulWorker } from "inline-webworker-functional/browser";
import {
  AdminWebsocket,
  AgentPubKey,
  AppAgentWebsocket,
  AppInfo,
  CellType,
  DnaHash,
  encodeHashToBase64,
  EntryHash,
  ListAppsResponse,
  ProvisionedCell,
  StemCell,
} from "@holochain/client";
import { v4 as uuidv4 } from "uuid";
import { encode } from "@msgpack/msgpack";
import { fromUint8Array } from "js-base64";

import { AppletsStore } from "../applets/applets-store";
import { AppletInstance } from "./types";
import { AppletMetadata } from "../types";
import { initAppClient } from "../utils";
import { manualReloadStore } from "../we-store";
import { GroupClient } from "./group-client";
import { DnaModifiers } from "@holochain/client";
import { ActionHash } from "@holochain/client";
import { getConductorInfo } from "../tauri";
import { ParentToWebWorkerMessage } from "../../../applet-messages/dist";
import { Hrl } from "../../../libs/hrl/dist";

// Given a group, all the functionality related to that group
export class GroupStore {
  profilesStore: ProfilesStore;
  peerStatusStore: PeerStatusStore;
  groupClient: GroupClient;

  members: AsyncReadable<Array<AgentPubKey>>;

  constructor(
    protected adminWebsocket: AdminWebsocket,
    public appAgentWebsocket: AppAgentWebsocket,
    public groupDnaHash: DnaHash,
    public roleName: string,
    public appletsStore: AppletsStore
  ) {
    this.groupClient = new GroupClient(appAgentWebsocket, roleName);

    this.peerStatusStore = new PeerStatusStore(
      new PeerStatusClient(appAgentWebsocket, roleName)
    );
    this.profilesStore = new ProfilesStore(
      new ProfilesClient(appAgentWebsocket, roleName)
    );
    this.members = this.profilesStore.agentsWithProfile;
  }

  async groupDnaModifiers(): Promise<DnaModifiers> {
    const appInfo = await this.appAgentWebsocket.appInfo();
    const cellInfo = appInfo.cell_info["group"].find(
      (cellInfo) =>
        CellType.Cloned in cellInfo &&
        cellInfo[CellType.Cloned].clone_id === this.roleName
    );

    if (!cellInfo) throw new Error("Could not find cell for this group");

    return cellInfo[CellType.Cloned].dna_modifiers;
  }

  networkSeed = lazyLoad(async () => {
    const dnaModifiers = await this.groupDnaModifiers();
    return dnaModifiers.network_seed;
  });

  groupInfo = lazyLoadAndPoll(async () => {
    const entryRecord = await this.groupClient.getGroupInfo();
    return entryRecord?.entry;
  }, 4000);

  appletAppId(
    devhubHappReleaseHash: EntryHash,
    networkSeed: string | undefined,
    properties: any
  ): string {
    return `${encodeHashToBase64(devhubHappReleaseHash)}-${
      networkSeed || ""
    }-${fromUint8Array(encode(properties))}`;
  }

  appletAppIdFromAppletInstance(appletInstance: AppletInstance): string {
    return this.appletAppId(
      appletInstance.devhub_happ_release_hash,
      appletInstance.network_seed,
      appletInstance.properties
    );
  }

  // Installs an applet instance that already exists in this group into this conductor
  async installAppletInstance(appletInstanceHash: EntryHash) {
    const appletInstance = await this.groupClient.getAppletInstance(
      appletInstanceHash
    );

    if (!appletInstance)
      throw new Error("Given applet instance hash was not found");

    const [appInfo, _] = await this.appletsStore.installApplet(
      appletInstance.entry.devhub_happ_release_hash,
      appletInstance.entry.devhub_gui_release_hash,
      this.appletAppIdFromAppletInstance(appletInstance.entry),
      appletInstance.entry.network_seed
    );
    return appInfo;
  }

  // Fetches the applet from the devhub, install its in the current conductor, and registers it in the group DNA
  async installAndRegisterAppletOnGroup(
    appletMetadata: AppletMetadata,
    customName: string
  ): Promise<EntryHash> {
    const networkSeed = uuidv4(); // generate random network seed if not provided

    const [appletInfo, logo_src]: [AppInfo, string | undefined] =
      await this.appletsStore.installApplet(
        appletMetadata.devhubHappReleaseHash,
        appletMetadata.devhubGuiReleaseHash,
        this.appletAppId(appletMetadata.devhubHappReleaseHash, networkSeed, {}),
        networkSeed
      );

    // --- Register hApp in the We DNA ---

    const dnaHashes: Record<string, DnaHash> = {};
    // add dna hashes and network seeds of all provisioned or deferred cells to the Applet entry
    Object.entries(appletInfo.cell_info).forEach(([roleName, cellInfos]) => {
      const provisionedCell = cellInfos.find(
        (cellInfo) => "provisioned" in cellInfo
      );
      const stemCell = cellInfos.find((cellInfo) => "stem" in cellInfo);
      if (stemCell && provisionedCell) {
        throw new Error(
          `Found a deferred cell and a provisioned cell for the role_name '${roleName}'`
        );
      }
      if (!stemCell && !provisionedCell) {
        throw new Error(
          `Found neither a deferred nor a provisioned cell for role_name '${roleName}'`
        );
      }
      if (provisionedCell) {
        dnaHashes[roleName] = (
          provisionedCell as { [CellType.Provisioned]: ProvisionedCell }
        ).provisioned.cell_id[0];
      }
      if (stemCell) {
        dnaHashes[roleName] = (
          stemCell as { [CellType.Stem]: StemCell }
        ).stem.dna;
      }
    });

    const applet: AppletInstance = {
      custom_name: customName,
      description: appletMetadata.description,
      devhub_gui_release_hash: appletMetadata.devhubGuiReleaseHash,
      devhub_happ_release_hash: appletMetadata.devhubHappReleaseHash,
      logo_src,
      network_seed: networkSeed,
      properties: {},
      dna_hashes: dnaHashes,
    };

    return this.groupClient.registerAppletInstance(applet);
  }

  registeredApplets = lazyLoadAndPoll(
    async () => this.groupClient.getAppletsInstances(),
    4000
  );

  installedApps = manualReloadStore(async () =>
    this.adminWebsocket.listApps({})
  );

  isInstalled = new LazyHoloHashMap((appletInstanceEntryHash) =>
    asyncDerived(
      join([
        this.applets.get(appletInstanceEntryHash),
        this.installedApps,
      ]) as AsyncReadable<[EntryRecord<AppletInstance>, ListAppsResponse]>,
      async ([appletInstance, apps]) => {
        if (!appletInstance) return false;
        const appletId = this.appletAppIdFromAppletInstance(
          appletInstance.entry
        );

        return !!apps.find((app) => app.installed_app_id === appletId);
      }
    )
  );

  federatedGroups = new LazyHoloHashMap((appletInstanceHash: EntryHash) =>
    lazyLoadAndPoll(
      async () => this.groupClient.getFederatedGroups(appletInstanceHash),
      5000
    )
  );

  applets = new LazyHoloHashMap((appletInstanceHash: EntryHash) =>
    lazyLoad(async () => this.groupClient.getAppletInstance(appletInstanceHash))
  );

  appletWorker = new LazyHoloHashMap((appletInstanceHash: EntryHash) =>
    asyncDerived(
      this.applets.get(appletInstanceHash),
      async (appletInstance) => {
        const appletId = this.appletAppIdFromAppletInstance(
          appletInstance!.entry
        );
        const info = await getConductorInfo();

        const worker = new Worker("applet-sandbox.js");

        async function postMessage(message: ParentToWebWorkerMessage) {
          await new Promise((resolve) => {
            const { port1, port2 } = new MessageChannel();

            worker.postMessage([port2]);

            port1.onmessage = (m) => {
              resolve(null);
            };
          });
        }

        await postMessage({
          type: "setup",
          appPort: info.app_port,
          appletId,
        } as ParentToWebWorkerMessage);

        return {
          info: (roleName, integrityZomeName, entryDefId, hrl) =>
            postMessage({
              type: "info",
              roleName,
              integrityZomeName,
              entryDefId,
              hrl,
            }),
          createAttachment: (attachmentType: string, attachToHrl: Hrl) => {
            postMessage({
              type: "create-attachment",
              attachmentType,
              attachToHrl,
            });
          },
        };
      }
    )
  );

  appletClient = new LazyHoloHashMap((appletInstanceHash: EntryHash) =>
    asyncDerived(
      this.applets.get(appletInstanceHash),
      async (appletInstance) => {
        if (!appletInstance) throw new Error("Applet instance not found");

        // TODO: if this applet is not installed yet, display dialog to install it
        const appletId = this.appletAppIdFromAppletInstance(
          appletInstance.entry
        );

        return initAppClient(appletId);
      }
    )
  );
}
