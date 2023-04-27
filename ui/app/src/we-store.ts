import {
  asyncDerived,
  asyncDeriveStore,
  AsyncReadable,
  AsyncStatus,
  join,
  joinAsyncMap,
  lazyLoad,
  retryUntilSuccess,
  toPromise,
  writable,
} from "@holochain-open-dev/stores";
import {
  EntryHashMap,
  HoloHashMap,
  LazyHoloHashMap,
  mapValues,
} from "@holochain-open-dev/utils";
import { DnaHashB64 } from "@holochain/client";
import { encodeHashToBase64 } from "@holochain/client";
import { EntryHashB64 } from "@holochain/client";
import {
  ActionHash,
  AdminWebsocket,
  AppAgentClient,
  AppAgentWebsocket,
  CellType,
  ClonedCell,
  DnaHash,
  EntryHash,
  RoleName,
} from "@holochain/client";
import { GroupProfile } from "@lightningrodlabs/we-applet";
import { v4 as uuidv4 } from "uuid";
import {
  InternalAppletAttachmentTypes,
  InternalAttachmentType,
  InternalGroupAttachmentTypes,
  InternalGroupWithApplets,
} from "../../applet-messages/dist";
import { AppletHost } from "./applet-host";

import { AppletsStore } from "./applets/applets-store";
import { GroupClient } from "./groups/group-client";
import {
  appletAppIdFromAppletInstance,
  GroupStore,
} from "./groups/group-store";
import { AppletInstance } from "./groups/types";
import { DnaLocation, locateHrl } from "./processes/hrl/locate-hrl.js";
import { ConductorInfo } from "./tauri";
import { findAppForDnaHash, findAppletInstanceForAppInfo } from "./utils.js";

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
    public conductorInfo: ConductorInfo,
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

    const groupProfile: GroupProfile = {
      logo_src: logo,
      name: name,
    };

    await groupClient.setGroupInfo(groupProfile);

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

  originalGroupDnaHash = lazyLoad<DnaHash>(async () => {
    const appInfo = await this.appAgentWebsocket.appInfo();

    for (const cellInfo of appInfo.cell_info["group"]) {
      if (CellType.Provisioned in cellInfo) {
        return cellInfo[CellType.Provisioned].cell_id[0];
      }
    }

    throw new Error("There is no provisioned cell in this app");
  });

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

  allGroupsProfiles = asyncDeriveStore(this.allGroups, (groupsStores) =>
    joinAsyncMap(mapValues(groupsStores, (store) => store.groupProfile))
  );

  allAppletsInstancesByGroup = asyncDeriveStore(this.allGroups, (allGroups) =>
    joinAsyncMap(mapValues(allGroups, (store) => store.registeredApplets))
  );

  appletsInstancesByGroup = new LazyHoloHashMap(
    (groupDnaHash: DnaHash) =>
      new LazyHoloHashMap((appletInstanceHash: EntryHash) =>
        asyncDeriveStore(this.groups.get(groupDnaHash), (groupStore) =>
          groupStore.applets.get(appletInstanceHash)
        )
      )
  );

  dnaLocations = new LazyHoloHashMap((dnaHash: DnaHash) =>
    asyncDerived(
      this.allAppletsInstancesByGroup,
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

  appletsByGroup = new LazyHoloHashMap(
    (
      devhubReleaseEntryHash: EntryHash // appletid
    ) =>
      asyncDerived(
        join([
          this.allGroups,
          this.allGroupsProfiles,
          this.allAppletsInstancesByGroup,
        ] as [
          AsyncReadable<HoloHashMap<DnaHash, GroupStore>>,
          AsyncReadable<HoloHashMap<DnaHash, GroupProfile>>,
          AsyncReadable<HoloHashMap<DnaHash, EntryHashMap<AppletInstance>>>
        ]),
        async ([groupsStores, groupInfos, groupAppletInstances]) => {
          const appletsByGroup: HoloHashMap<DnaHash, InternalGroupWithApplets> =
            new HoloHashMap();
          let appletInstalledAppId: string;

          for (const [groupDnaHash, instances] of Array.from(
            groupAppletInstances.entries()
          )) {
            const groupStore = groupsStores.get(groupDnaHash);

            if (instances.size > 0) {
              appletInstalledAppId = appletAppIdFromAppletInstance(
                Array.from(instances.values())[0]
              );
            }

            const applets: Record<string, string> = {};
            const instancesForThisApplet = Array.from(
              instances.entries()
            ).filter(
              ([_, i]) =>
                i.devhub_happ_release_hash.toString() ===
                devhubReleaseEntryHash.toString()
            );

            for (const [
              appletInstanceHash,
              instance,
            ] of instancesForThisApplet) {
              applets[encodeHashToBase64(appletInstanceHash)] =
                appletAppIdFromAppletInstance(instance);
            }

            appletsByGroup.set(groupDnaHash, {
              applets,
              groupId: groupDnaHash,
              groupProfile: groupInfos.get(groupDnaHash),
              profilesAppId: this.conductorInfo.we_app_id,
              profilesRoleName: groupStore.roleName,
            });
          }

          return {
            appletsByGroup,
            appletInstalledAppId: appletInstalledAppId!,
          };
        }
      )
  );

  appletsHosts = new LazyHoloHashMap(
    (groupDnaHash: DnaHash) =>
      new LazyHoloHashMap((appletInstanceHash: EntryHash) =>
        asyncDerived(
          this.appletsInstancesByGroup
            .get(groupDnaHash)
            .get(appletInstanceHash),
          async (appletInstance) => {
            const appletInstalledAppId = appletAppIdFromAppletInstance(
              appletInstance!.entry
            );

            const origin = `applet://${appletInstalledAppId}`;
            const iframe = document.createElement("iframe");
            iframe.src = origin;
            iframe.style.display = "none";
            document.body.appendChild(iframe);

            return AppletHost.connect(
              appletInstalledAppId,
              groupDnaHash,
              appletInstanceHash,
              iframe,
              this,
              undefined
            );
          }
        )
      )
  );

  allAppletsHosts = asyncDeriveStore(
    this.allAppletsInstancesByGroup,
    async (groupAppletInstances) => {
      return joinAsyncMap(
        mapValues(groupAppletInstances, (appletsInGroup, groupDnaHash) =>
          joinAsyncMap(
            mapValues(appletsInGroup, (_, appletInstanceHash) =>
              this.appletsHosts.get(groupDnaHash).get(appletInstanceHash)
            )
          )
        )
      );
    }
  );

  attachmentTypesByGroup = asyncDeriveStore(
    this.allAppletsHosts,
    async (appletsHostsByGroupAndApplet) => {
      return joinAsyncMap(
        mapValues(appletsHostsByGroupAndApplet, (hostsByApplet) =>
          joinAsyncMap(
            mapValues(hostsByApplet, (host) =>
              lazyLoad(() => host.getAttachmentTypes())
            )
          )
        )
      );
    }
  );

  groupAttachmentTypes: AsyncReadable<
    Record<DnaHashB64, InternalGroupAttachmentTypes>
  > = asyncDerived(
    join([
      this.allAppletsInstancesByGroup,
      this.allGroupsProfiles,
      this.attachmentTypesByGroup,
    ] as [
      AsyncReadable<HoloHashMap<DnaHash, EntryHashMap<AppletInstance>>>,
      AsyncReadable<HoloHashMap<DnaHash, GroupProfile>>,
      AsyncReadable<
        HoloHashMap<
          DnaHash,
          EntryHashMap<Record<string, InternalAttachmentType>>
        >
      >
    ]),
    ([appletInstancesByGroup, groupsProfiles, attachmentTypesByGroup]) => {
      const groupAttachmentTypes: Record<
        DnaHashB64,
        InternalGroupAttachmentTypes
      > = {};

      for (const [groupDnaHash, attachmentsByApplet] of Array.from(
        attachmentTypesByGroup.entries()
      )) {
        const internalAppletAttachmentTypes: Record<
          EntryHashB64,
          InternalAppletAttachmentTypes
        > = {};
        for (const [appletInstanceHash, appletAttachmentTypes] of Array.from(
          attachmentsByApplet.entries()
        )) {
          internalAppletAttachmentTypes[
            encodeHashToBase64(appletInstanceHash)
          ] = {
            attachmentTypes: appletAttachmentTypes,
            appletName: appletInstancesByGroup
              .get(groupDnaHash)
              .get(appletInstanceHash).custom_name,
          };
        }
        groupAttachmentTypes[encodeHashToBase64(groupDnaHash)] = {
          groupProfile: groupsProfiles.get(groupDnaHash),
          attachmentTypesByApplet: internalAppletAttachmentTypes,
        };
      }

      return groupAttachmentTypes;
    }
  );
}
