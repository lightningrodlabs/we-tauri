import {
  alwaysSubscribed,
  asyncDerived,
  asyncDeriveStore,
  AsyncReadable,
  completed,
  get,
  joinAsyncMap,
  lazyLoad,
  manualReloadStore,
  mapAndJoin,
  pipe,
  race,
  retryUntilSuccess,
  sliceAndJoin,
  toPromise,
} from "@holochain-open-dev/stores";
import {
  HoloHashMap,
  LazyHoloHashMap,
  mapValues,
  pickBy,
  slice,
} from "@holochain-open-dev/utils";
import {
  AppStatusFilter,
  decodeHashFromBase64,
  HoloHash,
} from "@holochain/client";
import { encodeHashToBase64 } from "@holochain/client";
import { EntryHashB64 } from "@holochain/client";
import {
  ActionHash,
  AdminWebsocket,
  AppAgentWebsocket,
  CellType,
  ClonedCell,
  DnaHash,
  EntryHash,
  RoleName,
} from "@holochain/client";
import { GroupProfile } from "@lightningrodlabs/we-applet";
import { v4 as uuidv4 } from "uuid";
import { InternalAttachmentType, ProfilesLocation } from "applet-messages";

import { AppletBundlesStore } from "./applet-bundles/applet-bundles-store";
import { GroupClient } from "./groups/group-client";
import { GroupStore } from "./groups/group-store";
import { DnaLocation, locateHrl } from "./processes/hrl/locate-hrl.js";
import { ConductorInfo } from "./tauri";
import { findAppForDnaHash } from "./utils.js";
import { AppletStore } from "./applets/applet-store";

export function getAll<H extends HoloHash, T>(
  hashes: AsyncReadable<Array<H>>,
  values: LazyHoloHashMap<H, AsyncReadable<T | undefined>>
): AsyncReadable<ReadonlyMap<H, T>> {
  return asyncDeriveStore(
    hashes,
    (h) => joinAsyncMap(slice(values, h)) as AsyncReadable<ReadonlyMap<H, T>>
  );
}

export class WeStore {
  constructor(
    public adminWebsocket: AdminWebsocket,
    public appAgentWebsocket: AppAgentWebsocket,
    public conductorInfo: ConductorInfo,
    public appletBundlesStore: AppletBundlesStore
  ) {}

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

    await groupClient.setGroupProfile(groupProfile);

    await this.groupsRolesByDnaHash.reload();

    return groupClonedCell;
  }

  public async joinGroup(networkSeed: string): Promise<ClonedCell> {
    const appInfo = await this.appAgentWebsocket.appInfo();

    for (const cellInfo of appInfo.cell_info["group"]) {
      if (CellType.Cloned in cellInfo) {
        const cell = cellInfo[CellType.Cloned];
        if (cell.dna_modifiers.network_seed === networkSeed) {
          if (cell.enabled) {
            throw new Error("This group is already installed");
          } else {
            const clonedCell = await this.appAgentWebsocket.enableCloneCell({
              clone_cell_id: [cell.cell_id[0], this.appAgentWebsocket.myPubKey],
            });

            await this.groupsRolesByDnaHash.reload();

            const groupStore = await toPromise(
              this.groups.get(clonedCell.cell_id[0])
            );
            const applets = await toPromise(groupStore.allApplets);

            const apps = await this.adminWebsocket.listApps({
              status_filter: { Disabled: null } as any,
            });

            for (const app of apps) {
              if (
                applets.find(
                  (appletHash) =>
                    app.installed_app_id === encodeHashToBase64(appletHash)
                )
              ) {
                await this.adminWebsocket.enableApp({
                  installed_app_id: app.installed_app_id,
                });
              }
            }

            await this.appletBundlesStore.installedApps.reload();
            return clonedCell;
          }
        }
      }
    }

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

  public async leaveGroup(groupDnaHash: DnaHash) {
    await this.appAgentWebsocket.disableCloneCell({
      clone_cell_id: [groupDnaHash, this.appAgentWebsocket.myPubKey],
    });

    const groupStore = await toPromise(this.groups.get(groupDnaHash));
    const applets = await toPromise(groupStore.allApplets);

    for (const appletHash of applets) {
      const groupsForApplet = await toPromise(
        this.groupsForApplet.get(appletHash)
      );
      if (groupsForApplet.size === 1) {
        await this.adminWebsocket.disableApp({
          installed_app_id: encodeHashToBase64(appletHash),
        });
      }
    }

    await this.appletBundlesStore.installedApps.reload();
    await this.groupsRolesByDnaHash.reload();
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
      if (CellType.Cloned in cellInfo && cellInfo[CellType.Cloned].enabled) {
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
        this.appAgentWebsocket,
        groupDnaHash,
        groupRoleName,
        this
      );
    })
  );

  applets = new LazyHoloHashMap((appletHash: EntryHash) =>
    retryUntilSuccess(async () => {
      const groups = await toPromise(this.groupsForApplet.get(appletHash));

      const applet = await Promise.race(
        Array.from(groups.values()).map((groupStore) =>
          toPromise(groupStore.applets.get(appletHash))
        )
      );
      if (!applet) throw new Error("Applet not found yet");

      return new AppletStore(appletHash, applet, this);
    })
  );

  allGroups = asyncDeriveStore(this.groupsRolesByDnaHash, (rolesByDnaHash) =>
    mapAndJoin(rolesByDnaHash, (_, dnaHash) => this.groups.get(dnaHash))
  );

  allInstalledApplets = pipe(
    this.appletBundlesStore.installedApplets,
    (appletsIds) =>
      sliceAndJoin(this.applets, appletsIds) as AsyncReadable<
        ReadonlyMap<EntryHash, AppletStore>
      >
  );

  allGroupsProfiles = asyncDeriveStore(this.allGroups, (groupsStores) =>
    mapAndJoin(groupsStores, (store) => store.groupProfile)
  );

  groupsForApplet = new LazyHoloHashMap((appletHash: EntryHash) =>
    pipe(
      this.allGroups,
      (allGroups) => mapAndJoin(allGroups, (store) => store.allApplets),
      (appletsByGroup) => {
        const groupDnaHashes = Array.from(appletsByGroup.entries())
          .filter(([_groupDnaHash, appletsHashes]) =>
            appletsHashes.find(
              (hash) => hash.toString() === appletHash.toString()
            )
          )
          .map(([groupDnaHash, _]) => groupDnaHash);
        return sliceAndJoin(this.groups, groupDnaHashes);
      }
    )
  );

  dnaLocations = new LazyHoloHashMap((dnaHash: DnaHash) =>
    asyncDerived(
      this.appletBundlesStore.installedApps,
      async (installedApps) => {
        const app = findAppForDnaHash(installedApps, dnaHash);

        if (!app) throw new Error("The given dna is not installed");

        return {
          appletHash: decodeHashFromBase64(app.appInfo.installed_app_id),
          appInfo: app.appInfo,
          roleName: app.roleName,
        } as DnaLocation;
      }
    )
  );

  hrlLocations = new LazyHoloHashMap(
    (dnaHash: DnaHash) =>
      new LazyHoloHashMap((hash: EntryHash | ActionHash) =>
        asyncDerived(
          this.dnaLocations.get(dnaHash),
          async (dnaLocation: DnaLocation) => {
            const entryDefLocation = await locateHrl(
              this.adminWebsocket,
              dnaLocation,
              [dnaHash, hash]
            );
            if (!entryDefLocation) return undefined;

            return {
              dnaLocation,
              entryDefLocation,
            };
          }
        )
      )
  );

  entryInfo = new LazyHoloHashMap(
    (dnaHash: DnaHash) =>
      new LazyHoloHashMap((hash: EntryHash | ActionHash) =>
        pipe(this.hrlLocations.get(dnaHash).get(hash), (location) =>
          location
            ? pipe(
                this.applets.get(location.dnaLocation.appletHash),
                (appletStore) => appletStore!.host,
                (host) =>
                  lazyLoad(() =>
                    host.getEntryInfo(
                      location.dnaLocation.roleName,
                      location.entryDefLocation.integrity_zome,
                      location.entryDefLocation.entry_def,
                      [dnaHash, hash]
                    )
                  )
              )
            : completed(undefined)
        )
      )
  );

  appletsForBundleHash = new LazyHoloHashMap(
    (
      appBundleHash: EntryHash // appletid
    ) =>
      pipe(
        this.allInstalledApplets,
        (installedApplets) =>
          completed(
            pickBy(
              installedApplets,
              (appletStore) =>
                appletStore.applet.devhub_happ_release_hash.toString() ===
                appBundleHash.toString()
            )
          ),
        (appletsForThisBundleHash) =>
          mapAndJoin(appletsForThisBundleHash, (_, appletHash) =>
            this.groupsForApplet.get(appletHash)
          ),
        (groupsByApplets) => {
          const appletsB64: Record<EntryHashB64, ProfilesLocation> = {};

          for (const [appletHash, groups] of Array.from(
            groupsByApplets.entries()
          )) {
            if (groups.size > 0) {
              appletsB64[encodeHashToBase64(appletHash)] = {
                profilesAppId: this.conductorInfo.we_app_id,
                profilesRoleName: Array.from(groups.values())[0].roleName,
              };
            }
          }
          return completed(appletsB64);
        }
      )
  );

  allAppletsHosts = pipe(this.allInstalledApplets, (applets) =>
    mapAndJoin(applets, (appletStore) => appletStore.host)
  );

  allAttachmentTypes: AsyncReadable<
    Record<EntryHashB64, Record<string, InternalAttachmentType>>
  > = alwaysSubscribed(
    pipe(
      this.allInstalledApplets,
      (installedApplets) =>
        mapAndJoin(
          installedApplets,
          (appletStore) => appletStore.attachmentTypes
        ),
      (allAttachmentTypes) => {
        const attachments: Record<
          EntryHashB64,
          Record<string, InternalAttachmentType>
        > = {};

        for (const [appletHash, appletAttachments] of Array.from(
          allAttachmentTypes.entries()
        )) {
          if (Object.keys(appletAttachments).length > 0) {
            attachments[encodeHashToBase64(appletHash)] = appletAttachments;
          }
        }
        return completed(attachments);
      }
    )
  );
}
