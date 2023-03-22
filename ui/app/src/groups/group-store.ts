import {
  PeerStatusClient,
  PeerStatusStore,
} from "@holochain-open-dev/peer-status";
import { ProfilesClient, ProfilesStore } from "@holochain-open-dev/profiles";
import {
  asyncDerived,
  asyncDeriveStore,
  AsyncReadable,
  lazyLoad,
  lazyLoadAndPoll,
} from "@holochain-open-dev/stores";
import { LazyHoloHashMap } from "@holochain-open-dev/utils";
import {
  AdminWebsocket,
  AgentPubKey,
  AppAgentWebsocket,
  AppInfo,
  CellType,
  DnaHash,
  DnaModifiers,
  encodeHashToBase64,
  EntryHash,
  ProvisionedCell,
  StemCell,
} from "@holochain/client";
import { v4 as uuidv4 } from "uuid";
import { decode, encode } from "@msgpack/msgpack";
import { AppletsStore } from "../applets/applets-store";
import { AppletsClient } from "./applets-client";
import { AppletInstance, GroupInfo } from "./types";
import { AppletMetadata } from "../types";
import { initAppClient } from "../utils";
import { fromUint8Array } from "js-base64";

// Given a group, all the functionality related to that group
export class GroupStore {
  profilesStore: ProfilesStore;
  peerStatusStore: PeerStatusStore;
  appletsClient: AppletsClient;

  members: AsyncReadable<Array<AgentPubKey>>;

  constructor(
    protected adminWebsocket: AdminWebsocket,
    public appAgentWebsocket: AppAgentWebsocket,
    public groupDnaHash: DnaHash,
    public roleName: string,
    public appletsStore: AppletsStore
  ) {
    this.appletsClient = new AppletsClient(appAgentWebsocket, roleName);

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

  groupInfo = lazyLoad(async () => {
    const modifiers = await this.groupDnaModifiers();
    return decode(modifiers.properties) as GroupInfo;
  });

  appletAppId(
    devhubHappReleaseHash: EntryHash,
    networkSeed: string | undefined,
    properties: any
  ): string {
    return `applet@${encodeHashToBase64(devhubHappReleaseHash)}-${
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
    const appletInstance = await this.appletsClient.getAppletInstance(
      appletInstanceHash
    );

    if (!appletInstance)
      throw new Error("Given applet instance hash was not found");

    return this.appletsStore.installApplet(
      appletInstance.entry.devhub_happ_release_hash,
      appletInstance.entry.devhub_gui_release_hash,
      this.appletAppIdFromAppletInstance(appletInstance.entry),
      appletInstance.entry.network_seed
    );
  }

  // Fetches the applet from the devhub, install its in the current conductor, and registers it in the group DNA
  async installAndRegisterAppletOnGroup(
    appletMetadata: AppletMetadata,
    customName: string
  ): Promise<EntryHash> {
    const networkSeed = uuidv4(); // generate random network seed if not provided

    const appletInfo: AppInfo = await this.appletsStore.installApplet(
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
      logo_src: undefined, // TODO: change
      network_seed: networkSeed,
      properties: {},
      dna_hashes: dnaHashes,
    };

    return this.appletsClient.registerAppletInstance(applet);
  }

  installedApplets = lazyLoadAndPoll(
    async () => this.appletsClient.getAppletsInstances(),
    1000
  );

  federatedGroups = new LazyHoloHashMap((appletInstanceHash: EntryHash) =>
    lazyLoadAndPoll(
      async () => this.appletsClient.getFederatedGroups(appletInstanceHash),
      1000
    )
  );

  applets = new LazyHoloHashMap((appletInstanceHash: EntryHash) =>
    lazyLoad(async () =>
      this.appletsClient.getAppletInstance(appletInstanceHash)
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
