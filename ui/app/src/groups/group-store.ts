import {
  PeerStatusClient,
  PeerStatusStore,
} from "@holochain-open-dev/peer-status";
import { ProfilesClient, ProfilesStore } from "@holochain-open-dev/profiles";
import {
  asyncDerived,
  AsyncReadable,
  completed,
  join,
  lazyLoad,
  lazyLoadAndPoll,
  mapAndJoin,
  pipe,
  sliceAndJoin,
  toPromise,
} from "@holochain-open-dev/stores";
import { LazyHoloHashMap } from "@holochain-open-dev/utils";
import {
  AgentPubKey,
  AppAgentWebsocket,
  CellType,
  DnaHash,
  EntryHash,
} from "@holochain/client";
import { v4 as uuidv4 } from "uuid";
import { DnaModifiers } from "@holochain/client";

import { GroupProfile } from "@lightningrodlabs/we-applet";

import { GroupClient } from "./group-client.js";
import { CustomViewsStore } from "../custom-views/custom-views-store.js";
import { CustomViewsClient } from "../custom-views/custom-views-client.js";
import { WeStore } from "../we-store.js";
import { AppEntry, Entity } from "../processes/appstore/types.js";
import { Applet } from "../applets/types.js";

// Given a group, all the functionality related to that group
export class GroupStore {
  profilesStore: ProfilesStore;

  peerStatusStore: PeerStatusStore;

  groupClient: GroupClient;

  customViewsStore: CustomViewsStore;

  members: AsyncReadable<Array<AgentPubKey>>;

  constructor(
    public appAgentWebsocket: AppAgentWebsocket,
    public groupDnaHash: DnaHash,
    public weStore: WeStore
  ) {
    this.groupClient = new GroupClient(appAgentWebsocket, "group");

    this.peerStatusStore = new PeerStatusStore(
      new PeerStatusClient(appAgentWebsocket, "group")
    );
    this.profilesStore = new ProfilesStore(
      new ProfilesClient(appAgentWebsocket, "group")
    );
    this.customViewsStore = new CustomViewsStore(
      new CustomViewsClient(appAgentWebsocket, "group")
    );
    this.members = this.profilesStore.agentsWithProfile;
  }

  public async addRelatedGroup(
    groupDnaHash: DnaHash,
    groupProfile: GroupProfile
  ) {
    const groupStore = await toPromise(this.weStore.groups.get(groupDnaHash));

    const modifiers = await groupStore.groupDnaModifiers();

    await this.groupClient.addRelatedGroup({
      group_profile: groupProfile,
      network_seed: modifiers.network_seed,
      group_dna_hash: groupDnaHash,
    });
  }

  async groupDnaModifiers(): Promise<DnaModifiers> {
    const appInfo = await this.appAgentWebsocket.appInfo();
    const cellInfo = appInfo.cell_info["group"].find(
      (cellInfo) => CellType.Provisioned in cellInfo
    );

    if (!cellInfo) throw new Error("Could not find cell for this group");

    return cellInfo[CellType.Provisioned].dna_modifiers;
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

    return this.weStore.appletBundlesStore.installApplet(appletHash, applet);
  }

  // Fetches the applet from the devhub, installs it in the current conductor, and registers it in the group DNA
  async installAppletBundle(
    appEntry: Entity<AppEntry>,
    customName: string
  ): Promise<EntryHash> {
    const networkSeed = uuidv4();

    const latestRelease =
      await this.weStore.appletBundlesStore.getLatestVersion(appEntry);

    const applet: Applet = {
      custom_name: customName,
      description: appEntry.content.description,

      appstore_app_hash: appEntry.id,

      devhub_dna_hash: appEntry.content.devhub_address.dna,
      devhub_happ_release_hash: latestRelease.id,
      devhub_gui_release_hash: latestRelease.content.official_gui!,
      network_seed: networkSeed,
      properties: {},
    };

    const appletHash = await this.groupClient.hashApplet(applet);

    await this.weStore.appletBundlesStore.installApplet(appletHash, applet);

    // --- Register hApp in the We DNA ---
    await this.groupClient.registerApplet(applet);

    return appletHash;
  }

  appletFederatedGroups = new LazyHoloHashMap((appletHash: EntryHash) =>
    lazyLoadAndPoll(
      async () => this.groupClient.getFederatedGroups(appletHash),
      5000
    )
  );

  applets = new LazyHoloHashMap((appletHash: EntryHash) =>
    lazyLoad(async () => this.groupClient.getApplet(appletHash))
  );

  allApplets = lazyLoadAndPoll(async () => this.groupClient.getApplets(), 4000);

  archivedApplets = lazyLoadAndPoll(
    async () => this.groupClient.getArchivedApplets(),
    4000
  );

  installedApplets = asyncDerived(
    join([this.allApplets, this.weStore.appletBundlesStore.installedApplets]),
    ([allApplets, installedApplets]) =>
      allApplets.filter((appletHash) =>
        installedApplets.find(
          (installedAppletHash) =>
            installedAppletHash.toString() === appletHash.toString()
        )
      )
  );

  allBlocks = pipe(
    this.installedApplets,
    (allApplets) => sliceAndJoin(this.weStore.appletStores, allApplets),
    (appletsStores) => mapAndJoin(appletsStores, (s) => s.blocks)
  );

  relatedGroups = lazyLoadAndPoll(
    () => this.groupClient.getRelatedGroups(),
    10000
  );
}
