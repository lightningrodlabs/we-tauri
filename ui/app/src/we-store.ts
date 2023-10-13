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
  decodeHashFromBase64,
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
import { GroupProfile, HrlB64WithContext, HrlWithContext, InternalAttachmentType, ProfilesLocation } from "@lightningrodlabs/we-applet";
import { v4 as uuidv4 } from "uuid";
import { invoke } from "@tauri-apps/api";
import { notify } from "@holochain-open-dev/elements";
import { msg } from "@lit/localize";

import { AppletBundlesStore } from "./applet-bundles/applet-bundles-store.js";
import { APPLETS_POLLING_FREQUENCY, GroupStore } from "./groups/group-store.js";
import { DnaLocation, locateHrl } from "./processes/hrl/locate-hrl.js";
import { ConductorInfo, joinGroup } from "./tauri.js";
import { appIdFromAppletHash, appletHashFromAppId, findAppForDnaHash, hrlWithContextToB64, initAppClient, isAppDisabled } from "./utils.js";
import { AppletStore } from "./applets/applet-store.js";
import { AppletHash, AppletId } from "./types.js";
import { ResourceLocatorB64 } from "./processes/appstore/get-happ-releases.js";
import { Applet } from "./applets/types.js";
import { GroupClient } from "./groups/group-client.js";

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

    console.log("Group created. AppInfo: ", appInfo);

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

  /**
   * Uninstalls the group DNA and all Applet DNA's that have been installed
   * only in this group
   *
   * @param groupDnaHash
   */
  public async leaveGroup(groupDnaHash: DnaHash) {
    const groupStore = await toPromise(this.groups.get(groupDnaHash));

    // We want to be sure we really get all applets here, i.e. we're
    // not relying on AsyncReadables. And we do that before we uninstall
    // anything, in case it fails.
    const applets = await groupStore.groupClient.getMyApplets();

    await this.adminWebsocket.uninstallApp({
      installed_app_id: groupStore.groupClient.appAgentClient.installedAppId,
    });

    await Promise.all(
      applets.map(async (appletHash) => {
        // TODO: Is this save? groupsForApplet depends on the network so it may not always
        // actually return all groups that depend on this applet
        const groupsForApplet = await this.getGroupsForApplet(appletHash);

        if (
          groupsForApplet.length === 1
          && encodeHashToBase64(groupsForApplet[0]) === encodeHashToBase64(groupDnaHash)
        ) {
          await this.adminWebsocket.uninstallApp({
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
        const groups = await toPromise(this.groupsForApplet.get(appletHash));

        if (groups.size === 0)
          throw new Error("Applet is not installed in any of the groups");

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
      10
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


  /**
   * A reliable function to get the groups for an applet and is guaranteed
   * to reflect the current state.
   */
  getGroupsForApplet = async (appletHash: AppletHash) => {
    const allApps = await this.adminWebsocket.listApps({});
    const groupApps = allApps.filter((app) =>
      app.installed_app_id.startsWith("group#")
    );
    const groupsWithApplet: Array<DnaHash> = [];
    groupApps.forEach(async (app) => {
      const groupAppAgentWebsocket = await initAppClient(
        app.installed_app_id
      );
      const groupDnaHash = decodeHashFromBase64(app.installed_app_id.slice(6));
      const groupClient = new GroupClient(groupAppAgentWebsocket, "group");
      const allMyAppletDatas = await groupClient.getMyApplets();
      if (
        allMyAppletDatas
          .map(([hash, _applet]) => hash.toString())
          .includes(appletHash.toString())
      ) {
        groupsWithApplet.push(groupDnaHash);
      }
    })
    return groupsWithApplet;
  }

  groupsForApplet = new LazyHoloHashMap((appletHash: EntryHash) =>
    pipe(
      this.allGroups,
      (allGroups) => mapAndJoin(allGroups, (store) => store.allMyApplets),
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

        // Disabling an applet here is dangerous. this.allGroups is coming from a
        // manualReloadStore(), i.e. it is not reliable to be up to date with the
        // actual state in the conductor.
        // if (groupDnaHashes.length === 0) {
        //   this.appletBundlesStore.disableApplet(appletHash);
        // }

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

        console.log("@dnaLocations: found and returning app: ", app);
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
      new LazyHoloHashMap((hash: EntryHash | ActionHash) => {
        console.log("TRYING TO GET HRL LOCATION.");
        return asyncDerived(
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
        );
      }
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
                    host ? host.getAppletEntryInfo(
                      location.dnaLocation.roleName,
                      location.entryDefLocation.integrity_zome,
                      location.entryDefLocation.entry_def,
                      [dnaHash, hash]
                    ) : Promise.resolve(undefined)
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
      (runningApplets) =>
        mapAndJoin(
          runningApplets,
          (appletStore) => appletStore.attachmentTypes
        ),
      (allAttachmentTypes) => {
        const attachments: Record<
          AppletId,
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


  hrlToClipboard(hrl: HrlWithContext) {
    const hrlB64 = hrlWithContextToB64(hrl);
    const clipboardJSON = window.localStorage.getItem("clipboard");
    let clipboardContent: Array<HrlB64WithContext> = [];
    if (clipboardJSON) {
      clipboardContent = JSON.parse(clipboardJSON);
      // Only add if it's not already there
      if (clipboardContent.filter((hrlB64Stored) => JSON.stringify(hrlB64Stored) === JSON.stringify(hrlB64)).length === 0) {
        clipboardContent.push(hrlB64);
      }
    }
    window.localStorage.setItem("clipboard", JSON.stringify(clipboardContent));
    notify(msg("Added to clipboard."));
  }

  removeHrlFromClipboard(hrlB64: HrlB64WithContext) {
    const clipboardJSON = window.localStorage.getItem("clipboard");
    let clipboardContent: Array<HrlB64WithContext> = [];
    console.log("HRL B64: ", hrlB64);
    if (clipboardJSON) {
      clipboardContent = JSON.parse(clipboardJSON);
      const newClipboardContent = clipboardContent.filter((hrlB64Stored) => JSON.stringify(hrlB64Stored) !== JSON.stringify(hrlB64));
      window.localStorage.setItem("clipboard", JSON.stringify(newClipboardContent));
      // const index = clipboardContent.indexOf(hrlB64);
      // console.log("INDEX: ", index);
      // if (index > -1) { // only splice array when item is found
      //   clipboardContent.splice(index, 1);
      // }
    }
  }

}
