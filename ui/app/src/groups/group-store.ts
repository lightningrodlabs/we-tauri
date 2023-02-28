import {
  PeerStatusClient,
  PeerStatusStore,
} from "@holochain-open-dev/peer-status";
import { ProfilesClient, ProfilesStore } from "@holochain-open-dev/profiles";
import { AsyncReadable, lazyLoadAndPoll } from "@holochain-open-dev/stores";
import { LazyHoloHashMap } from "@holochain-open-dev/utils";
import {
  AdminWebsocket,
  AgentPubKey,
  AppAgentWebsocket,
  AppBundle,
  AppInfo,
  CellType,
  DnaHash,
  DnaModifiers,
  encodeHashToBase64,
  EntryHash,
  InstallAppRequest,
  InstalledAppId,
  ProvisionedCell,
  StemCell,
} from "@holochain/client";
import { v4 as uuidv4 } from "uuid";
import { decode } from "@msgpack/msgpack";
import { AppletsStore } from "../applets/applets-store";
import { AppletsClient } from "./applets-client";
import { AppletInstance, GroupInfo } from "./types";
import md5 from "md5";
import { AppletMetadata } from "../types";

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

  // Installs an applet instance that already exists in this group into this conductor
  async installAppletInstance(appletInstanceHash: EntryHash) {
    const appletInstance = await this.appletsClient.getAppletInstance(
      appletInstanceHash
    );

    if (!appletInstance)
      throw new Error("Given applet instance hash was not found");

    const [appBundle, guiFile, _iconSrcOption] =
      await this.appletsStore.fetchWebHapp(
        appletInstance.entry.devhub_happ_release_hash,
        appletInstance.entry.devhub_gui_release_hash
      );

    await this.installAppletFromBundle(
      appBundle,
      appletInstance.entry.network_seed,
      appletInstance.entry.custom_name
    );

    await this.appletsStore.appletsGuiClient.commitGuiFile(
      appletInstance.entry.devhub_happ_release_hash,
      guiFile
    );
  }

  // Fetches the applet from the devhub, install its in the current conductor, and registers it in the group DNA
  async installAndRegisterApplet(
    appletMetadata: AppletMetadata,
    customName: string
  ): Promise<EntryHash> {
    const [appBundle, guiFile, iconSrcOption] =
      await this.appletsStore.fetchWebHapp(
        appletMetadata.devhubHappReleaseHash,
        appletMetadata.devhubGuiReleaseHash
      );
    const networkSeed = uuidv4(); // generate random network seed if not provided

    const appletInfo: AppInfo = await this.installAppletFromBundle(
      appBundle,
      networkSeed,
      customName
    );

    await this.appletsStore.appletsGuiClient.commitGuiFile(
      appletMetadata.devhubHappReleaseHash,
      guiFile
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
      logo_src: iconSrcOption,
      network_seed: networkSeed,
      properties: {},
      dna_hashes: dnaHashes,
    };

    return this.appletsClient.registerAppletInstance(applet);
  }

  // Installs the given applet to the conductor
  private async installAppletFromBundle(
    bundle: AppBundle,
    networkSeed: string | undefined,
    customName: string
  ): Promise<AppInfo> {
    // hash network seed to not expose it in the app id but still
    // be able to detect the cell based on the network seed
    const hashedNetworkSeed = md5(networkSeed!, { asString: true });
    const installedAppId: InstalledAppId = `applet@we-${hashedNetworkSeed}-${customName}`;

    // install app bundle
    const request: InstallAppRequest = {
      agent_key: this.appAgentWebsocket.myPubKey,
      installed_app_id: installedAppId,
      membrane_proofs: {},
      bundle,
      network_seed: networkSeed,
    };
    const appInfo = await this.adminWebsocket.installApp(request);

    await this.adminWebsocket.enableApp({
      installed_app_id: installedAppId,
    });

    return appInfo;
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

  appletClient = new LazyHoloHashMap(async (appletInstanceHash: EntryHash) => {
    const appletInstance = await this.appletsClient.getAppletInstance(
      appletInstanceHash
    );

    const devhubHappEntryHash = appletInstance?.entry.devhub_happ_release_hash;

    if (!devhubHappEntryHash) throw new Error("Applet instance not found");

    // TODO: if this applet is not installed yet, display dialog to install it
    const appletId = await this.appletAppId(appletInstanceHash);
    const appletClient = await AppAgentWebsocket.connect(
      this.appAgentWebsocket.appWebsocket.client.socket.url,
      appletId
    );
    appletClient.installedAppId = appletId;

    return appletClient;
  });
}
