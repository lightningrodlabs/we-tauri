import {
  CloneDnaRecipe,
  MembraneInvitationsClient,
  MembraneInvitationsStore,
} from "@holochain-open-dev/membrane-invitations";
import {
  asyncDerived,
  asyncDeriveStore,
  asyncReadable,
  AsyncReadable,
  AsyncStatus,
  get,
  join,
  joinAsyncMap,
  lazyLoadAndPoll,
  retryUntilSuccess,
  toPromise,
  writable,
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
  ClonedCell,
  DnaHash,
  EntryHash,
  RoleName,
} from "@holochain/client";
import { GroupInfo, GroupWithApplets } from "@lightningrodlabs/we-applet";
import { encode } from "@msgpack/msgpack";
import { v4 as uuidv4 } from "uuid";

import { AppletsStore } from "./applets/applets-store";
import { GroupClient } from "./groups/group-client";
import { GroupStore } from "./groups/group-store";
import { AppletInstance } from "./groups/types";
import { DnaLocation, locateHrl } from "./processes/hrl/locate-hrl.js";
import {
  findAppForDnaHash,
  findAppletInstanceForAppInfo,
  getCellId,
  initAppClient,
} from "./utils.js";

export function manualReloadStore<T>(
  fn: () => Promise<T>
): AsyncReadable<T> & { reload: () => Promise<void> } {
  const store = writable<AsyncStatus<T>>({ status: "pending" });

  const reload = async () => {
    try {
      const value = await fn();
      store.set({
        status: "complete",
        value,
      });
    } catch (error) {
      store.set({ status: "error", error });
    }
  };

  reload();
  return {
    subscribe: store.subscribe,
    reload,
  };
}

export class WeStore {
  public appletsStore: AppletsStore;

  constructor(
    public adminWebsocket: AdminWebsocket,
    public appAgentWebsocket: AppAgentWebsocket,
    public devhubClient: AppAgentClient
  ) {
    this.appletsStore = new AppletsStore(devhubClient, adminWebsocket);
  }

  /**
   * Clones the group DNA with a new unique network seed, and creates a group info entry in that DNA
   */
  public async createGroup(name: string, logo: string): Promise<ClonedCell> {
    // generate random network seed (maybe use random words instead later, e.g. https://www.npmjs.com/package/generate-passphrase)
    const networkSeed = uuidv4();

    const groupClonedCell = await this.joinGroup(networkSeed); // this line also updates the matrix store

    const groupClient = new GroupClient(
      this.appAgentWebsocket,
      groupClonedCell.clone_id
    );

    const groupInfo: GroupInfo = {
      logo_src: logo,
      name: name,
    };

    await groupClient.setGroupInfo(groupInfo);

    return groupClonedCell;
  }

  public async joinGroup(networkSeed: string): Promise<ClonedCell> {
    // Create the group cell
    const clonedCell = await this.appAgentWebsocket.createCloneCell({
      role_name: "group",
      modifiers: {
        network_seed: networkSeed,
        // origin_time: Date.now() * 1000,
      },
    });

    await this.groupsRolesByDnaHash.reload();

    return clonedCell;
  }

  groupsRolesByDnaHash = manualReloadStore(async () => {
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
  });

  groups = new LazyHoloHashMap((groupDnaHash: DnaHash) =>
    retryUntilSuccess(async () => {
      const roleNames = await toPromise(this.groupsRolesByDnaHash);
      const groupRoleName = roleNames.get(groupDnaHash);

      if (!groupRoleName) throw new Error("Group not found yet");

      return new GroupStore(
        this.adminWebsocket,
        this.appAgentWebsocket,
        groupDnaHash,
        groupRoleName,
        this.appletsStore
      );
    })
  );

  allGroups = asyncDeriveStore(this.groupsRolesByDnaHash, (rolesByDnaHash) =>
    joinAsyncMap(
      mapValues(rolesByDnaHash, (_, dnaHash) => this.groups.get(dnaHash))
    )
  );

  allGroupsInfo = asyncDeriveStore(this.allGroups, (groupsStores) =>
    joinAsyncMap(mapValues(groupsStores, (store) => store.groupInfo))
  );

  appletsInstancesByGroup = asyncDeriveStore(this.allGroups, (allGroups) =>
    joinAsyncMap(mapValues(allGroups, (store) => store.registeredApplets))
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
          locateHrl(this.adminWebsocket, location, [dnaHash, hash])
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
                      return initAppClient(
                        appletId,
                        parseInt(
                          (window as any).__HC_LAUNCHER_ENV__
                            .APP_INTERFACE_PORT,
                          10
                        )
                      );
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
