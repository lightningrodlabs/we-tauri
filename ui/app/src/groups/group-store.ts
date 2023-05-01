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
import { DnaModifiers } from "@holochain/client";

import { AppletBundlesStore } from "../applet-bundles/applet-bundles-store";
import { Applet } from "./types";
import { AppletBundleMetadata } from "../types";
import { manualReloadStore } from "../we-store";
import { GroupClient } from "./group-client";

export function appletAppId(
  devhubHappReleaseHash: EntryHash,
  networkSeed: string | undefined,
  properties: any
): string {
  return `${encodeHashToBase64(devhubHappReleaseHash)}-${
    networkSeed || ""
  }-${fromUint8Array(encode(properties))}`;
}

export function appletAppIdFromApplet(applet: Applet): string {
  return appletAppId(
    applet.devhub_happ_release_hash,
    applet.network_seed,
    applet.properties
  );
}

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
    public appletsStore: AppletBundlesStore
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

  groupProfile = lazyLoadAndPoll(async () => {
    const entryRecord = await this.groupClient.getGroupProfile();
    return entryRecord?.entry;
  }, 4000);

  // Installs an applet instance that already exists in this group into this conductor
  async installApplet(appletHash: EntryHash) {
    const applet = await this.groupClient.getApplet(appletHash);

    if (!applet) throw new Error("Given applet instance hash was not found");

    const [appInfo, _] = await this.appletsStore.installAppletBundle(
      applet.entry.devhub_happ_release_hash,
      applet.entry.devhub_gui_release_hash,
      appletAppIdFromApplet(applet.entry),
      applet.entry.network_seed
    );
    return appInfo;
  }

  // Fetches the applet from the devhub, install its in the current conductor, and registers it in the group DNA
  async installedAppletBundle(
    appletMetadata: AppletBundleMetadata,
    customName: string
  ): Promise<EntryHash> {
    const networkSeed = uuidv4(); // generate random network seed if not provided

    const [appletInfo, logo_src]: [AppInfo, string | undefined] =
      await this.appletsStore.installAppletBundle(
        appletMetadata.devhubHappReleaseHash,
        appletMetadata.devhubGuiReleaseHash,
        appletAppId(appletMetadata.devhubHappReleaseHash, networkSeed, {}),
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

    const applet: Applet = {
      custom_name: customName,
      description: appletMetadata.description,
      devhub_gui_release_hash: appletMetadata.devhubGuiReleaseHash,
      devhub_happ_release_hash: appletMetadata.devhubHappReleaseHash,
      logo_src,
      network_seed: networkSeed,
      properties: {},
      dna_hashes: dnaHashes,
    };

    return this.groupClient.registerApplet(applet);
  }

  registeredApplets = lazyLoadAndPoll(
    async () => this.groupClient.getApplets(),
    4000
  );

  installedApps = manualReloadStore(async () =>
    this.adminWebsocket.listApps({})
  );

  isInstalled = new LazyHoloHashMap((appletEntryHash) =>
    asyncDerived(
      join([
        this.applets.get(appletEntryHash),
        this.installedApps,
      ]) as AsyncReadable<[EntryRecord<Applet>, ListAppsResponse]>,
      async ([applet, apps]) => {
        if (!applet) return false;
        const appletId = appletAppIdFromApplet(applet.entry);

        return !!apps.find((app) => app.installed_app_id === appletId);
      }
    )
  );

  federatedGroups = new LazyHoloHashMap((appletHash: EntryHash) =>
    lazyLoadAndPoll(
      async () => this.groupClient.getFederatedGroups(appletHash),
      5000
    )
  );

  applets = new LazyHoloHashMap((appletHash: EntryHash) =>
    lazyLoad(async () => this.groupClient.getApplet(appletHash))
  );
}
