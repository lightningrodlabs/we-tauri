import {
  CloneDnaRecipe,
  MembraneInvitationsClient,
  MembraneInvitationsStore,
} from "@holochain-open-dev/membrane-invitations";
import {
  asyncDerived,
  asyncDeriveStore,
  AsyncReadable,
  join,
  joinAsyncMap,
  lazyLoadAndPoll,
} from "@holochain-open-dev/stores";
import {
  EntryHashMap,
  EntryRecord,
  HoloHashMap,
  LazyHoloHashMap,
  mapValues,
} from "@holochain-open-dev/utils";
import {
  ActionHash,
  AdminWebsocket,
  AgentPubKey,
  AppAgentClient,
  AppAgentWebsocket,
  CellType,
  DnaHash,
  EntryHash,
  RoleName,
} from "@holochain/client";
import {
  GroupInfo,
  GroupWithApplets,
  WeApplet,
} from "@lightningrodlabs/we-applet";
import { encode } from "@msgpack/msgpack";
import { v4 as uuidv4 } from "uuid";

import { AppletsStore } from "./applets/applets-store";
import { GenericGroupStore } from "./groups/group-store";
import { AppletInstance } from "./groups/types";
import { DnaLocation, getRecord } from "./processes/hrl/locate-hrl.js";
import {
  findAppForDnaHash,
  findAppletInstanceForAppInfo,
  getCellId,
  initAppClient,
} from "./utils.js";

export class GroupStore extends GenericGroupStore<WeApplet> {}

export class WeStore {
  public appletsStore: AppletsStore;
  public membraneInvitationsStore: MembraneInvitationsStore;

  constructor(
    public adminWebsocket: AdminWebsocket,
    public appAgentWebsocket: AppAgentWebsocket,
    public devhubClient: AppAgentClient
  ) {
    this.appletsStore = new AppletsStore(devhubClient, adminWebsocket);
    this.membraneInvitationsStore = new MembraneInvitationsStore(
      new MembraneInvitationsClient(appAgentWebsocket, "lobby")
    );
  }

  /**
   * Clones the We DNA with a new unique weId as its UID
   * @param weName
   * @param weLogo
   */
  public async createGroup(name: string, logo: string): Promise<DnaHash> {
    // generate random network seed (maybe use random words instead later, e.g. https://www.npmjs.com/package/generate-passphrase)
    const networkSeed = uuidv4();

    const newGroupDnaHash = await this.installGroup(name, logo, networkSeed); // this line also updates the matrix store

    const appInfo = await this.appAgentWebsocket.appInfo();

    const groupCellInfo = appInfo.cell_info["group"].find(
      (cellInfo) => CellType.Provisioned in cellInfo
    );
    const groupDnaHash = getCellId(groupCellInfo!)![0];

    const properties: GroupInfo = {
      logo_src: logo,
      name: name,
    };

    await this.membraneInvitationsStore.client.createCloneDnaRecipe({
      original_dna_hash: groupDnaHash,
      network_seed: networkSeed,
      properties: encode(properties),
      resulting_dna_hash: newGroupDnaHash,
    });

    return newGroupDnaHash;
  }

  public async joinGroup(
    invitationActionHash: ActionHash,
    name: string,
    logo: string,
    networkSeed: string
  ): Promise<DnaHash> {
    const newWeGroupDnaHash = await this.installGroup(name, logo, networkSeed);
    await this.membraneInvitationsStore.client.removeInvitation(
      invitationActionHash
    );
    return newWeGroupDnaHash;
  }

  private async installGroup(
    name: string,
    logo: string,
    networkSeed: string
  ): Promise<DnaHash> {
    const properties: GroupInfo = {
      logo_src: logo,
      name: name,
    };

    // Create the We cell
    const clonedCell = await this.appAgentWebsocket.createCloneCell({
      role_name: "group",
      modifiers: {
        network_seed: networkSeed,
        properties,
        // origin_time: Date.now() * 1000,
      },
    });

    return clonedCell.cell_id[0];
  }

  /**
   * Invite another agent to join the specified We group.
   *
   * @param weGroupId : DnaHash
   * @param agentPubKey : AgentPubKey
   */
  public async inviteToJoinGroup(
    weGroupId: DnaHash,
    agentPubKey: AgentPubKey
  ): Promise<void> {

    const appInfo = await this.appAgentWebsocket.appInfo();
    const weCellInfo = appInfo.cell_info["group"].find((cellInfo) => "provisioned" in cellInfo);
    const weDnaHash = getCellId(weCellInfo!)![0];

    const records =
      await this.membraneInvitationsStore.client.getCloneRecipesForDna(
        weDnaHash
      );

    const clones: Array<EntryRecord<CloneDnaRecipe>> = records.map(
      (r) => new EntryRecord(r)
    );

    const recipe = clones.find(
      (c) => c.entry.resulting_dna_hash.toString() === weGroupId.toString()
    )!;

    console.log("Inviting with recipe: ", recipe.entry);

    // membrane invitations API will need to change uid --> network_seed
    await this.membraneInvitationsStore.client.inviteToJoinMembrane(
      recipe.entry,
      agentPubKey,
      undefined
    );
  }



  groupsRolesByDnaHash = lazyLoadAndPoll(async () => {
    const appInfo = await this.appAgentWebsocket.appInfo();
    const roleNames = new HoloHashMap<DnaHash, RoleName>();

    for (const cellInfo of appInfo.cell_info["group"]) {
      if (CellType.Cloned in cellInfo) {
        roleNames.set(
          cellInfo[CellType.Cloned].cell_id[0],
          cellInfo[CellType.Cloned].clone_id
        );
      }
    }
    return roleNames;
  }, 1000);

  groups = new LazyHoloHashMap((groupDnaHash: DnaHash) =>
    asyncDerived(this.groupsRolesByDnaHash, (rolesByDnaHash) => {
      return new GroupStore(
        this.adminWebsocket,
        this.appAgentWebsocket,
        groupDnaHash,
        rolesByDnaHash.get(groupDnaHash),
        this.appletsStore
      );
    })
  );

  allGroups = asyncDeriveStore(this.groupsRolesByDnaHash, (roleByDnaHash) =>
    joinAsyncMap(
      mapValues(roleByDnaHash, (_, dnaHash) => this.groups.get(dnaHash))
    )
  );

  allGroupsInfo = asyncDeriveStore(this.allGroups, (groupsStores) =>
    joinAsyncMap(mapValues(groupsStores, (store) => store.groupInfo))
  );

  appletsInstancesByGroup = asyncDeriveStore(this.allGroups, (allGroups) =>
    joinAsyncMap(mapValues(allGroups, (store) => store.installedApplets))
  );

  dnaLocations = new LazyHoloHashMap((dnaHash: DnaHash) =>
    asyncDerived(
      this.appletsInstancesByGroup,
      async (appletsInstancesByGroup) => {
        const apps = await this.adminWebsocket.listApps({});
        const app = findAppForDnaHash(apps, dnaHash);

        if (!app) throw new Error("The given dna is not installed");

        const { groupDnaHash, appletInstanceHash } =
          findAppletInstanceForAppInfo(appletsInstancesByGroup, app.appInfo);
        return {
          groupDnaHash,
          appletInstanceHash,
          appInfo: app.appInfo,
          roleName: app.roleName,
        } as DnaLocation;
      }
    )
  );

  hrlLocations = new LazyHoloHashMap(
    (dnaHash: DnaHash) =>
      new LazyHoloHashMap((hash: EntryHash | ActionHash) =>
        asyncDerived(this.dnaLocations.get(dnaHash), (location) =>
          getRecord(this.adminWebsocket, location, [dnaHash, hash])
        )
      )
  );

  groupAppletInfos = new LazyHoloHashMap(
    (
      devhubReleaseEntryHash: EntryHash // appletid
    ) =>
      asyncDerived(
        join([
          this.allGroups,
          this.allGroupsInfo,
          this.appletsInstancesByGroup,
        ] as [
          AsyncReadable<HoloHashMap<DnaHash, GroupStore>>,
          AsyncReadable<HoloHashMap<DnaHash, GroupInfo>>,
          AsyncReadable<HoloHashMap<DnaHash, EntryHashMap<AppletInstance>>>
        ]),
        async ([groupsStores, groupInfos, groupAppletInstances]) => {
          // TODO: install dialog if it hasn't been installed yet

          const groupAppletsInfos: GroupWithApplets[] = await Promise.all(
            Array.from(groupAppletInstances.entries()).map(
              async ([groupDnaHash, instances], index) => {
                const appletsClients = await Promise.all(
                  Array.from(instances.values())
                    .filter(
                      (instance) =>
                        instance.devhub_happ_release_hash.toString() ===
                        devhubReleaseEntryHash.toString()
                    )
                    .map(async (appletInstance) => {
                      const appletId = groupsStores
                        .get(groupDnaHash)
                        .appletAppIdFromAppletInstance(appletInstance);
                      return initAppClient(appletId);
                    })
                );
                return {
                  appletsClients,
                  groupServices: {
                    profilesStore: groupsStores.get(groupDnaHash).profilesStore,
                  },
                  groupInfo: groupInfos[index],
                } as GroupWithApplets;
              }
            )
          );

          return groupAppletsInfos;
        }
      )
  );
}
