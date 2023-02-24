import {
  PeerStatusClient,
  PeerStatusStore,
} from "@holochain-open-dev/peer-status";
import { ProfilesClient, ProfilesStore } from "@holochain-open-dev/profiles";
import { lazyLoadAndPoll } from "@holochain-open-dev/stores";
import { LazyHoloHashMap } from "@holochain-open-dev/utils";
import {
  AppAgentWebsocket,
  CellType,
  DnaModifiers,
  encodeHashToBase64,
  EntryHash,
} from "@holochain/client";
import { decode } from "@msgpack/msgpack";
import { AppletsStore } from "../applets/applets-store";
import { AppletsClient } from "./applets-client";
import { GroupInfo } from "./types";

export class GroupStore {
  profilesStore: ProfilesStore;
  peerStatusStore: PeerStatusStore;
  appletsClient: AppletsClient;

  constructor(
    public appAgentWebsocket: AppAgentWebsocket,
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

  async groupInfo(): Promise<GroupInfo> {
    const modifiers = await this.groupDnaModifiers();
    return decode(modifiers.properties) as GroupInfo;
  }

  async appletAppId(appletInstanceHash: EntryHash): Promise<string> {
    const groupDnaModifiers = await this.groupDnaModifiers();
    return `applet@we-${groupDnaModifiers.network_seed}-${encodeHashToBase64(
      appletInstanceHash
    )}`;
  }

  installAppletInstance(appletInstanceHash: EntryHash) {}

  appletsInstances = lazyLoadAndPoll(async () => {
    const recordBag = await this.appletsClient.getAppletsInstances();
    return recordBag.entryMap;
  }, 1000);

  federatedGroups = new LazyHoloHashMap((appletInstanceHash: EntryHash) =>
    lazyLoadAndPoll(
      async () => this.appletsClient.getFederatedGroups(appletInstanceHash),
      1000
    )
  );

  appletInstanceRenderers = new LazyHoloHashMap(
    async (appletInstanceHash: EntryHash) => {
      const appletInstance = await this.appletsClient.getAppletInstance(
        appletInstanceHash
      );

      const devhubHappEntryHash =
        appletInstance?.entry.devhub_happ_release_hash;

      if (!devhubHappEntryHash) throw new Error("Applet instance not found");

      // TODO: if this applet is not installed yet, display dialog to install it

      const gui = await this.appletsStore.appletsGui.get(devhubHappEntryHash);

      const appletId = await this.appletAppId(appletInstanceHash);
      const appletClient = await AppAgentWebsocket.connect(
        this.appAgentWebsocket.appWebsocket.client.socket.url,
        appletId
      );
      appletClient.installedAppId = appletId;

      return gui.groupPerspective(appletClient, await this.groupInfo(), {
        profilesStore: this.profilesStore,
      });
    }
  );
}
