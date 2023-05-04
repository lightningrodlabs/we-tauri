import {
  asyncDerived,
  asyncDeriveStore,
  AsyncReadable,
  AsyncStatus,
  derived,
  joinAsyncMap,
  lazyLoad,
  readable,
  Readable,
  retryUntilSuccess,
  toPromise,
  writable,
} from "@holochain-open-dev/stores";
import {
  HoloHashMap,
  LazyHoloHashMap,
  mapValues,
  pickBy,
  slice,
} from "@holochain-open-dev/utils";
import { decodeHashFromBase64, HoloHash } from "@holochain/client";
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

export function alwaysSubscribed<T>(readable: Readable<T>): Readable<T> {
  readable.subscribe(() => {});

  return readable;
}

export function pipe<T, U>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => AsyncReadable<U>
): AsyncReadable<U>;
export function pipe<T, U, V>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => AsyncReadable<U>,
  fn2: (arg: U) => AsyncReadable<V>
): AsyncReadable<V>;
export function pipe<T, U, V, W>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => AsyncReadable<U>,
  fn2: (arg: U) => AsyncReadable<V>,
  fn3: (arg: V) => AsyncReadable<W>
): AsyncReadable<W>;
export function pipe<T, U, V, W>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => AsyncReadable<U>,
  fn2?: (arg: U) => AsyncReadable<V>,
  fn3?: (arg: V) => AsyncReadable<W>
): AsyncReadable<W> {
  let s: AsyncReadable<any> = asyncDeriveStore(store, fn1);

  if (fn2) {
    s = asyncDeriveStore(s, fn2);
  }
  if (fn3) {
    s = asyncDeriveStore(s, fn3);
  }

  return s;
}

export function completed<T>(v: T): AsyncReadable<T> {
  return readable<AsyncStatus<T>>({
    status: "complete",
    value: v,
  });
}

export function race<T>(stores: Array<AsyncReadable<T>>): AsyncReadable<T> {
  let found: T | undefined;
  return derived(stores, (values) => {
    if (found)
      return {
        status: "complete",
        value: found,
      } as AsyncStatus<T>;

    const firstCompleted = values.find((v) => v.status === "complete");
    if (firstCompleted) {
      found = (firstCompleted as any).value as T;
      return {
        status: "complete",
        value: found,
      } as AsyncStatus<T>;
    }

    return {
      status: "pending",
    } as AsyncStatus<T>;
  });
}

export function asyncDeriveAndJoin<T, U>(
  store: AsyncReadable<T>,
  fn: (arg: T) => AsyncReadable<U>
): AsyncReadable<[T, U]> {
  return asyncDeriveStore(store, (v) => asyncDerived(fn(v), (u) => [v, u]));
}

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
        this.appAgentWebsocket,
        groupDnaHash,
        groupRoleName,
        this.appletBundlesStore
      );
    })
  );

  applets = new LazyHoloHashMap((appletHash: EntryHash) =>
    pipe(
      this.groupsForApplet.get(appletHash),
      (groups) =>
        race(
          Array.from(groups.values()).map((groupStore) =>
            groupStore.applets.get(appletHash)
          )
        ),
      (applet) =>
        completed(
          applet ? new AppletStore(appletHash, applet, this) : undefined
        )
    )
  );

  allGroups = asyncDeriveStore(this.groupsRolesByDnaHash, (rolesByDnaHash) =>
    joinAsyncMap(
      mapValues(rolesByDnaHash, (_, dnaHash) => this.groups.get(dnaHash))
    )
  );

  allInstalledApplets = pipe(
    this.appletBundlesStore.installedApplets,
    (appletsIds) =>
      joinAsyncMap(slice(this.applets, appletsIds)) as AsyncReadable<
        ReadonlyMap<EntryHash, AppletStore>
      >
  );

  allGroupsProfiles = asyncDeriveStore(this.allGroups, (groupsStores) =>
    joinAsyncMap(mapValues(groupsStores, (store) => store.groupProfile))
  );

  groupsForApplet = new LazyHoloHashMap((appletHash: EntryHash) =>
    pipe(
      this.allGroups,
      (allGroups) =>
        joinAsyncMap(mapValues(allGroups, (store) => store.allApplets)),
      (appletsByGroup) => {
        const groupDnaHashes = Array.from(appletsByGroup.entries())
          .filter(([_groupDnaHash, appletsHashes]) =>
            appletsHashes.find(
              (hash) => hash.toString() === appletHash.toString()
            )
          )
          .map(([groupDnaHash, _]) => groupDnaHash);
        return joinAsyncMap(slice(this.groups, groupDnaHashes));
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
          joinAsyncMap(
            mapValues(appletsForThisBundleHash, (_, appletHash) =>
              this.groupsForApplet.get(appletHash)
            )
          ),
        (groupsByApplets) => {
          const appletsB64: Record<EntryHashB64, ProfilesLocation> = {};

          for (const [appletHash, groups] of Array.from(
            groupsByApplets.entries()
          )) {
            appletsB64[encodeHashToBase64(appletHash)] = {
              profilesAppId: this.conductorInfo.we_app_id,
              profilesRoleName: Array.from(groups.values())[0].roleName,
            };
          }
          return completed(appletsB64);
        }
      )
  );

  allAppletsHosts = pipe(this.allInstalledApplets, (applets) =>
    joinAsyncMap(mapValues(applets, (appletStore) => appletStore.host))
  );

  allAttachmentTypes: AsyncReadable<
    Record<EntryHashB64, Record<string, InternalAttachmentType>>
  > = alwaysSubscribed(
    pipe(
      this.allInstalledApplets,
      (installedApplets) =>
        joinAsyncMap(
          mapValues(
            installedApplets,
            (appletStore) => appletStore.attachmentTypes
          )
        ),
      (allAttachmentTypes) => {
        const attachments: Record<
          EntryHashB64,
          Record<string, InternalAttachmentType>
        > = {};

        for (const [appletHash, appletAttachments] of Array.from(
          allAttachmentTypes.entries()
        )) {
          attachments[encodeHashToBase64(appletHash)] = appletAttachments;
        }

        return completed(attachments);
      }
    )
  );
}
