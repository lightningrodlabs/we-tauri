import {
  MembraneInvitationsClient,
  MembraneInvitationsStore,
} from "@holochain-open-dev/membrane-invitations";
import {
  asyncDerived,
  asyncDeriveStore,
  AsyncReadable,
  join,
  joinAsyncMap,
  lazyLoad,
  lazyLoadAndPoll,
} from "@holochain-open-dev/stores";
import {
  EntryHashMap,
  HoloHashMap,
  LazyHoloHashMap,
  mapValues,
} from "@holochain-open-dev/utils";
import {
  ActionHash,
  AppAgentWebsocket,
  CellType,
  DnaHash,
  encodeHashToBase64,
  EntryHash,
  RoleName,
} from "@holochain/client";
import { GroupInfo, GroupWithApplets } from "@lightningrodlabs/we-applet";
import { encode } from "@msgpack/msgpack";
import Emittery, { UnsubscribeFunction } from "emittery";
import { v4 as uuidv4 } from "uuid";

import { AppletsStore } from "./applets/applets-store";
import { GroupStore } from "./groups/group-store";
import { AppletInstance } from "./groups/types";
import { getCellId } from "./utils";

export interface WeEvents {
  GroupCreated: DnaHash;
}

export class WeStore {
  public appletsStore: AppletsStore;
  public membraneInvitationsStore: MembraneInvitationsStore;

  emitter = new Emittery<WeEvents>();

  constructor(public appAgentWebsocket: AppAgentWebsocket) {
    this.appletsStore = new AppletsStore(appAgentWebsocket, "lobby");
    this.membraneInvitationsStore = new MembraneInvitationsStore(
      new MembraneInvitationsClient(appAgentWebsocket, "lobby")
    );
  }

  on<Name extends keyof WeEvents>(
    eventName: Name | readonly Name[],
    listener: (eventData: WeEvents[Name]) => void | Promise<void>
  ): UnsubscribeFunction {
    return this.emitter.on(eventName, listener);
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

    this.emitter.emit("GroupCreated", groupDnaHash);

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
        this.appAgentWebsocket,
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
    joinAsyncMap(
      mapValues(groupsStores, (store) => lazyLoad(() => store.groupInfo()))
    )
  );

  allAppletsInstances = asyncDeriveStore(this.allGroups, (allGroups) =>
    joinAsyncMap(mapValues(allGroups, (store) => store.appletsInstances))
  );

  agentCentricRenderers = new LazyHoloHashMap(
    (
      devhubReleaseEntryHash: EntryHash // appletid
    ) =>
      asyncDerived(
        join([this.allGroups, this.allGroupsInfo, this.allAppletsInstances] as [
          AsyncReadable<HoloHashMap<DnaHash, GroupStore>>,
          AsyncReadable<HoloHashMap<DnaHash, GroupInfo>>,
          AsyncReadable<HoloHashMap<DnaHash, EntryHashMap<AppletInstance>>>
        ]),
        async ([groupsStores, groupInfos, groupAppletInstances]) => {
          const gui = await this.appletsStore.appletsGui.get(
            devhubReleaseEntryHash
          );

          // TODO: install dialog if it hasn't been installed yet

          const groupAppletsInfos: GroupWithApplets[] = await Promise.all(
            Array.from(groupAppletInstances.entries()).map(
              async ([groupDnaHash, instances], index) => {
                const appletsClients = await Promise.all(
                  Array.from(instances.entries())
                    .filter(
                      ([appletInstanceHash, instance]) =>
                        instance.devhub_happ_release_hash.toString() ===
                        devhubReleaseEntryHash.toString()
                    )
                    .map(async ([appletInstanceHash, instance]) => {
                      const appletId = await groupsStores
                        .get(groupDnaHash)
                        .appletAppId(appletInstanceHash);
                      const appletClient = await AppAgentWebsocket.connect(
                        this.appAgentWebsocket.appWebsocket.client.socket.url,
                        appletId
                      );
                      appletClient.installedAppId = appletId;
                      return appletClient;
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

          return gui.crossGroupPerspective(groupAppletsInfos);
        }
      )
  );
}
