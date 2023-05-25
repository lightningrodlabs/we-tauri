import {
  PeerStatusClient,
  PeerStatusStore,
} from "@holochain-open-dev/peer-status";
import { ProfilesClient, ProfilesStore } from "@holochain-open-dev/profiles";
import {
  AsyncReadable,
  lazyLoad,
  lazyLoadAndPoll,
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

import { AppletBundlesStore } from "../applet-bundles/applet-bundles-store";
import { AppletBundleMetadata } from "../types";
import { GroupClient } from "./group-client";
import { Applet } from "../applets/types";
import { CustomViewsStore } from "../custom-views/custom-views-store";
import { CustomViewsClient } from "../custom-views/custom-views-client";

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
    public roleName: string,
    public appletBundlesStore: AppletBundlesStore
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

    return this.appletBundlesStore.installApplet(appletHash, applet);
  }

  // Fetches the applet from the devhub, installs it in the current conductor, and registers it in the group DNA
  async installAppletBundle(
    appletMetadata: AppletBundleMetadata,
    customName: string
  ): Promise<EntryHash> {
    // Trigger the download of the webhapp
    // TODO: remove this when moving to app store
    await toPromise(
      this.appletBundlesStore.appletBundleLogo.get(
        appletMetadata.devhubHappReleaseHash
      )
    );

    const networkSeed = uuidv4(); // generate random network seed if not provided

    // --- Register hApp in the We DNA ---

    const applet: Applet = {
      custom_name: customName,
      description: appletMetadata.description,
      devhub_gui_release_hash: appletMetadata.devhubGuiReleaseHash,
      devhub_happ_release_hash: appletMetadata.devhubHappReleaseHash,
      network_seed: networkSeed,
      properties: {},
    };

    const appletHash = await this.groupClient.registerApplet(applet);

    await this.appletBundlesStore.installApplet(appletHash, applet);

    return appletHash;
  }

  federatedGroups = new LazyHoloHashMap((appletHash: EntryHash) =>
    lazyLoadAndPoll(
      async () => this.groupClient.getFederatedGroups(appletHash),
      5000
    )
  );

  applets = new LazyHoloHashMap((appletHash: EntryHash) =>
    lazyLoad(async () => this.groupClient.getApplet(appletHash))
  );

  allApplets = lazyLoadAndPoll(async () => this.groupClient.getApplets(), 4000);
}
