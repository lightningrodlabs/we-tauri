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
import { HoloHashMap, LazyHoloHashMap, pick } from "@holochain-open-dev/utils";
import {
  MembraneInvitationsStore,
  MembraneInvitationsClient,
  CloneDnaRecipe,
} from "@holochain-open-dev/membrane-invitations";
import {
  AgentPubKey,
  AppAgentWebsocket,
  CellType,
  DnaHash,
  EntryHash,
} from "@holochain/client";
import { v4 as uuidv4 } from "uuid";
import { DnaModifiers } from "@holochain/client";

import { AppletBundleMetadata } from "../types";
import { GroupClient } from "./group-client";
import { Applet } from "../applets/types";
import { CustomViewsStore } from "../custom-views/custom-views-store";
import { CustomViewsClient } from "../custom-views/custom-views-client";
import { WeStore } from "../we-store";
import { GroupProfile } from "../../../libs/we-applet/dist";
import { encode } from "@msgpack/msgpack";
import { AppEntry, Entity } from "../processes/appstore/types";

// Given a group, all the functionality related to that group
export class GroupStore {
  profilesStore: ProfilesStore;
  peerStatusStore: PeerStatusStore;
  groupClient: GroupClient;
  customViewsStore: CustomViewsStore;
  membraneInvitationsStore: MembraneInvitationsStore;

  members: AsyncReadable<Array<AgentPubKey>>;

  relatedGroups: AsyncReadable<ReadonlyMap<DnaHash, CloneDnaRecipe>>;

  constructor(
    public appAgentWebsocket: AppAgentWebsocket,
    public groupDnaHash: DnaHash,
    public roleName: string,
    public weStore: WeStore
  ) {
    this.groupClient = new GroupClient(appAgentWebsocket, roleName);

    this.peerStatusStore = new PeerStatusStore(
      new PeerStatusClient(appAgentWebsocket, roleName)
    );
    this.profilesStore = new ProfilesStore(
      new ProfilesClient(appAgentWebsocket, roleName)
    );
    this.customViewsStore = new CustomViewsStore(
      new CustomViewsClient(appAgentWebsocket, roleName)
    );
    this.membraneInvitationsStore = new MembraneInvitationsStore(
      new MembraneInvitationsClient(appAgentWebsocket, roleName)
    );
    this.members = this.profilesStore.agentsWithProfile;
    this.relatedGroups = pipe(
      this.weStore.originalGroupDnaHash,
      (originalDnaHash) =>
        this.membraneInvitationsStore.cloneDnaRecipes.get(originalDnaHash),
      (cloneDnaRecipes) => {
        const groups: HoloHashMap<DnaHash, CloneDnaRecipe> = new HoloHashMap();
        for (const recipe of cloneDnaRecipes) {
          groups.set(recipe.entry.resulting_dna_hash, recipe.entry);
        }

        return completed(groups);
      }
    );
  }

  public async addRelatedGroup(
    groupDnaHash: DnaHash,
    groupProfile: GroupProfile
  ) {
    const original_dna_hash = await toPromise(
      this.weStore.originalGroupDnaHash
    );

    const groupStore = await toPromise(this.weStore.groups.get(groupDnaHash));

    const modifiers = await groupStore.groupDnaModifiers();

    await this.membraneInvitationsStore.client.createCloneDnaRecipe({
      custom_content: encode(groupProfile),
      network_seed: modifiers.network_seed,
      properties: modifiers.properties,
      original_dna_hash,
      resulting_dna_hash: groupStore.groupDnaHash,
    });
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

    return this.weStore.appletBundlesStore.installApplet(appletHash, applet);
  }

  // Fetches the applet from the devhub, installs it in the current conductor, and registers it in the group DNA
  async installAppletBundle(
    appEntry: Entity<AppEntry>,
    customName: string
  ): Promise<EntryHash> {
    // Trigger the download of the webhapp
    // TODO: remove this when moving to app store
    await toPromise(
      this.weStore.appletBundlesStore.appletBundleLogo.get(
        appEntry.content.devhub_address.happ
      )
    );

    const networkSeed = uuidv4(); // generate random network seed if not provided

    // --- Register hApp in the We DNA ---

    const applet: Applet = {
      custom_name: customName,
      description: appEntry.content.description,
      app_entry_hash: appEntry.id,
      network_seed: networkSeed,
      properties: {},
    };

    const appletHash = await this.groupClient.registerApplet(applet);

    try {
      await this.weStore.appletBundlesStore.installApplet(appletHash, applet);
    } catch (e) {
      await this.groupClient.unregisterApplet(appletHash);
      throw e;
    }

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
    (allApplets) => sliceAndJoin(this.weStore.applets, allApplets),
    (appletsStores) => mapAndJoin(appletsStores, (s) => s.blocks)
  );
}
