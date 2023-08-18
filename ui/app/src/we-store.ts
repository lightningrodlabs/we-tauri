import {
  alwaysSubscribed,
  asyncDerived,
  asyncDeriveStore,
  AsyncReadable,
  completed,
  lazyLoad,
  mapAndJoin,
  pipe,
  retryUntilSuccess,
  sliceAndJoin,
  toPromise,
  Readable,
  Writable,
  writable,
  derived,
} from "@holochain-open-dev/stores";
import { LazyHoloHashMap, pickBy } from "@holochain-open-dev/utils";
import {
  AppInfo,
  AppWebsocket,
  InstalledAppId,
  ProvisionedCell,
} from "@holochain/client";
import { encodeHashToBase64 } from "@holochain/client";
import { EntryHashB64 } from "@holochain/client";
import {
  ActionHash,
  AdminWebsocket,
  CellType,
  DnaHash,
  EntryHash,
} from "@holochain/client";
import { GroupProfile } from "@lightningrodlabs/we-applet";
import { v4 as uuidv4 } from "uuid";
import { invoke } from "@tauri-apps/api";
import { InternalAttachmentType, ProfilesLocation } from "applet-messages";

import { AppletBundlesStore } from "./applet-bundles/applet-bundles-store.js";
import { APPLETS_POLLING_FREQUENCY, GroupStore } from "./groups/group-store.js";
import { DnaLocation, locateHrl } from "./processes/hrl/locate-hrl.js";
import { ConductorInfo, joinGroup } from "./tauri.js";
import { appIdFromAppletHash, appletHashFromAppId, findAppForDnaHash, initAppClient, isAppDisabled } from "./utils.js";
import { AppletStore } from "./applets/applet-store.js";
import { AppletHash, AppletId } from "./types.js";
import { ResourceLocatorB64 } from "./processes/appstore/get-happ-releases.js";

export class WeStore {

  constructor(
    public adminWebsocket: AdminWebsocket,
    public appWebsocket: AppWebsocket,
    public conductorInfo: ConductorInfo,
    public appletBundlesStore: AppletBundlesStore
  ) {}

  private _selectedAppletHash: Writable<AppletHash | undefined> = writable(undefined);


  selectedAppletHash(): Readable<AppletHash | undefined> {
    return derived(this._selectedAppletHash, (hash) => hash);
  }

  selectAppletHash(hash: AppletHash | undefined) {
    this._selectedAppletHash.update((_) => hash);
  }

  public availableUiUpdates: Record<InstalledAppId, ResourceLocatorB64> = {};

  public async fetchAvailableUiUpdates() {
    this.availableUiUpdates = await invoke("fetch_available_ui_updates", {});
  }

  /**
   * Clones the group DNA with a new unique network seed, and creates a group info entry in that DNA
   */
  public async createGroup(name: string, logo: string): Promise<AppInfo> {
    // generate random network seed (maybe use random words instead later, e.g. https://www.npmjs.com/package/generate-passphrase)
    const networkSeed = uuidv4();

    const appInfo = await this.joinGroup(networkSeed); // this line also updates the matrix store

    const groupDnaHash: DnaHash =
      appInfo.cell_info["group"][0][CellType.Provisioned].cell_id[0];

    const groupStore = await toPromise(this.groups.get(groupDnaHash));

    const groupProfile: GroupProfile = {
      logo_src: logo,
      name,
    };

    try {
      await groupStore.groupClient.setGroupProfile(groupProfile);
    } catch (e) {
      // If we can't set profile, disable the group and bubble the error
      await this.leaveGroup(groupDnaHash);

      throw e;
    }

    return appInfo;
  }

  public async joinGroup(networkSeed: string): Promise<AppInfo> {
    try {
      const appInfo = await joinGroup(
        networkSeed,
        this.appletBundlesStore.appstoreClient.myPubKey
      );
      await this.appletBundlesStore.installedApps.reload();
      await this.appletBundlesStore.runningApps.reload();
      return appInfo;
    } catch (e) {
      console.error("Error installing group app: ", e);
      return Promise.reject(new Error(`Failed to install group app: ${e}`))
    }
  }

  public async leaveGroup(groupDnaHash: DnaHash) {
    const groupStore = await toPromise(this.groups.get(groupDnaHash));

    await this.adminWebsocket.disableApp({
      installed_app_id: groupStore.groupClient.appAgentClient.installedAppId,
    });

    const applets = await toPromise(groupStore.allApplets);

    await Promise.all(
      applets.map(async (appletHash) => {
        // TODO: Is this save? groupsForApplet depends on the network so it may not always
        // actually return all groups that depend on this applet
        const groupsForApplet = await toPromise(
          this.groupsForApplet.get(appletHash)
        );
        if (groupsForApplet.size === 1) {
          await this.adminWebsocket.disableApp({
            installed_app_id: appIdFromAppletHash(appletHash),
          });
        }
      })
    );

    await this.appletBundlesStore.installedApps.reload();
    await this.appletBundlesStore.runningApps.reload();
  }

  runningGroupsApps = asyncDerived(this.appletBundlesStore.runningApps, (apps) =>
    apps.filter((app) => app.installed_app_id.startsWith("group#"))
  );

  groupsDnaHashes = asyncDerived(this.runningGroupsApps, (apps) => {
    const groupApps = apps.filter((app) =>
      app.installed_app_id.startsWith("group#")
    );

    const groupsDnaHashes = groupApps.map((app) => {
      const cell = app.cell_info["group"][0][
        CellType.Provisioned
      ] as ProvisionedCell;
      return cell.cell_id[0];
    });
    return groupsDnaHashes;
  });

  groups = new LazyHoloHashMap((groupDnaHash: DnaHash) =>
    asyncDerived(this.runningGroupsApps, async (apps) => {
      const groupApp = apps.find(
        (app) =>
          app.cell_info["group"][0][
            CellType.Provisioned
          ].cell_id[0].toString() === groupDnaHash.toString()
      );
      if (!groupApp) throw new Error("Group not found yet");

      const groupAppAgentWebsocket = await initAppClient(
        groupApp.installed_app_id
      );
      return new GroupStore(groupAppAgentWebsocket, groupDnaHash, this);
    })
  );

  appletStores = new LazyHoloHashMap((appletHash: EntryHash) =>
    retryUntilSuccess(
      async () => {
        let groups = await toPromise(this.groupsForApplet.get(appletHash));

        if (groups.size === 0) {
          // retry after APPLETS_POLLING_FREQUENCY milliseconds in case the applet has just been
          // freshly installed
          setTimeout(async () => {
            groups = await toPromise(this.groupsForApplet.get(appletHash));
            if (groups.size === 0) throw new Error("Applet is not installed in any of the groups");
          }, APPLETS_POLLING_FREQUENCY);
        }


        const applet = await Promise.race(
          Array.from(groups.values()).map((groupStore) =>
            toPromise(groupStore.applets.get(appletHash))
          )
        );

        if (!applet) throw new Error("Applet not found yet");

        return new AppletStore(
          appletHash,
          applet,
          this.conductorInfo,
          this.appletBundlesStore
        );
      },
      3000,
      4
    )
  );

  allGroups = asyncDeriveStore(this.groupsDnaHashes, (groupsDnaHahes) =>
    sliceAndJoin(this.groups, groupsDnaHahes)
  );

  // allInstalledApplets = pipe(
  //   this.appletBundlesStore.installedApplets,
  //   (appletsHashes) =>
  //     sliceAndJoin(this.appletStores, appletsHashes) as AsyncReadable<
  //       ReadonlyMap<EntryHash, AppletStore>
  //     >
  // );

  allRunningApplets = pipe(
    this.appletBundlesStore.runningApplets,
    (appletsHashes) =>
      sliceAndJoin(this.appletStores, appletsHashes) as AsyncReadable<
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
        // console.log("appletsByGroup: ", Array.from(appletsByGroup.values()).map((hashes) => hashes.map((hash) => encodeHashToBase64(hash))));
        const groupDnaHashes = Array.from(appletsByGroup.entries())
          .filter(([_groupDnaHash, appletsHashes]) =>
            appletsHashes.find(
              (hash) => hash.toString() === appletHash.toString()
            )
          )
          .map(([groupDnaHash, _]) => groupDnaHash);

        // console.log("Requested applet hash: ", encodeHashToBase64(appletHash));
        // console.log("groupDnaHashes: ", groupDnaHashes);

        if (groupDnaHashes.length === 0) {
          // console.log("//////// Disabling applet with hash: ", encodeHashToBase64(appletHash));
          this.appletBundlesStore.disableApplet(appletHash);
        }

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
        if (!app.appInfo.installed_app_id.startsWith("applet#")) throw new Error("The given dna is part of an app that's not an applet.");

        return {
          appletHash: appletHashFromAppId(app.appInfo.installed_app_id),
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
            console.log("@hrlLocations: got dnaLocation: ", dnaLocation);
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
                this.appletStores.get(location.dnaLocation.appletHash),
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
      appletBundleHash: ActionHash // action hash of the AppEntry in the app store
    ) =>
      pipe(
        this.allRunningApplets,
        (runningApplets) =>
          completed(
            pickBy(
              runningApplets,
              (appletStore) =>
                appletStore.applet.appstore_app_hash.toString() ===
                appletBundleHash.toString()
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
              const firstGroupAppId = Array.from(groups.values())[0].groupClient
                .appAgentClient.installedAppId;
              appletsB64[encodeHashToBase64(appletHash)] = {
                profilesAppId: firstGroupAppId,
                profilesRoleName: "group",
              };
            }
          }
          return completed(appletsB64);
        }
      )
  );

  allAppletsHosts = pipe(this.allRunningApplets, (applets) =>
    mapAndJoin(applets, (appletStore) => appletStore.host)
  );

  allAttachmentTypes: AsyncReadable<
    Record<EntryHashB64, Record<string, InternalAttachmentType>>
  > = alwaysSubscribed(
    pipe(
      this.allRunningApplets,
      (runningApplets) => mapAndJoin(
          runningApplets,
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
