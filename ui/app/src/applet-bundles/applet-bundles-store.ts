import {
  asyncDerived,
  lazyLoadAndPoll,
  manualReloadStore,
  pipe,
  retryUntilSuccess,
  toPromise,
} from "@holochain-open-dev/stores";
import { HoloHashMap, LazyHoloHashMap } from "@holochain-open-dev/utils";
import {
  ActionHash,
  AdminWebsocket,
  AppAgentClient,
  AppInfo,
  decodeHashFromBase64,
  encodeHashToBase64,
  EntryHash,
} from "@holochain/client";
import { invoke } from "@tauri-apps/api";
import { Applet } from "../applets/types.js";
import { getHappReleases, getVisibleHostsForZomeFunction } from "../processes/appstore/get-happ-releases.js";
import { getAllApps } from "../processes/appstore/get-happs.js";
import {
  AppEntry,
  Entity,
  HappReleaseEntry,
  HostAvailability,
} from "../processes/appstore/types.js";
import { ConductorInfo } from "../tauri.js";
import { appIdFromAppletHash, appletHashFromAppId, isAppRunning } from "../utils.js";

export class AppletBundlesStore {
  constructor(
    public appstoreClient: AppAgentClient,
    public adminWebsocket: AdminWebsocket,
    public conductorInfo: ConductorInfo
  ) {}

  allAppletBundles = lazyLoadAndPoll(
    async () => getAllApps(this.appstoreClient),
    30000
  );

  appletBundles = new LazyHoloHashMap((appletBundleHash: ActionHash) =>
    asyncDerived(this.allAppletBundles, async (appletBundles) => {
      const appletBundle = appletBundles.find(
        (app) => app.id.toString() === appletBundleHash.toString()
      );
      return appletBundle;
    })
  );

  appletBundleLogo = new LazyHoloHashMap((appletBundleHash: ActionHash) =>
    pipe(this.appletBundles.get(appletBundleHash), (appEntry) =>
      retryUntilSuccess(async () => {
        if (!appEntry) throw new Error("Can't find app bundle");

        const icon: string = await invoke("fetch_icon", {
          appActionHashB64: encodeHashToBase64(appEntry.id),
        });

        if (!icon) throw new Error("Icon was not found");

        return icon;
      })
    )
  );

  async getVisibleHosts (
    appEntry: Entity<AppEntry>
  ): Promise<HostAvailability> {
    return getVisibleHostsForZomeFunction(
      this.appstoreClient,
      appEntry.content.devhub_address.dna,
      "happ_library",
      "get_webhapp_package", // TODO change to 'get_webasset_file' once fetching in chunks is implemented
      4000,
    )
  }

  async getLatestVersion(
    appEntry: Entity<AppEntry>
  ): Promise<Entity<HappReleaseEntry>> {
    const appReleases = await getHappReleases(this.appstoreClient, {
      dna_hash: appEntry.content.devhub_address.dna,
      resource_hash: appEntry.content.devhub_address.happ,
    });

    if (appReleases.length === 0)
      throw new Error("This app doesn't have any releases yet.");

    const latestRelease = appReleases.sort(
      (happRelease1, happRelease2) =>
        happRelease2.content.ordering - happRelease1.content.ordering
    )[0];

    if (!latestRelease.content.official_gui)
      throw new Error("This app doesn't have an official GUI.");

    return latestRelease;
  }

  async installApplet(appletHash: EntryHash, applet: Applet): Promise<AppInfo> {
    const appId = appIdFromAppletHash(appletHash);

    const appInfo: AppInfo = await invoke("install_applet_bundle_if_necessary", {
      appId,
      networkSeed: applet.network_seed,
      membraneProofs: {},
      agentPubKey: encodeHashToBase64(this.appstoreClient.myPubKey),
      devhubDnaHash: encodeHashToBase64(applet.devhub_dna_hash),
      happReleaseHash: encodeHashToBase64(applet.devhub_happ_release_hash),
      happEntryActionHash: encodeHashToBase64(applet.devhub_happ_entry_action_hash),
    });

    await this.runningApps.reload();
    // TODO check whether reloading this.installedApps is required as well

    return appInfo;
  }

  async disableApplet(appletHash: EntryHash) {
    const installed = await toPromise(this.isInstalled.get(appletHash));
    if (!installed) return;

    await this.adminWebsocket.disableApp({
      installed_app_id: appIdFromAppletHash(appletHash),
    });

    await this.runningApps.reload();
  }

  async enableApplet(appletHash: EntryHash) {
    const installed = await toPromise(this.isInstalled.get(appletHash));
    if (!installed) return;

    await this.adminWebsocket.enableApp({
      installed_app_id: appIdFromAppletHash(appletHash),
    });

    await this.runningApps.reload();
  }

  runningApps = manualReloadStore(async () => {
    const apps = await this.adminWebsocket.listApps({});
    return apps.filter((app) => isAppRunning(app));
  });

  installedApps = manualReloadStore(async () =>
    this.adminWebsocket.listApps({})
  );

  runningApplets = asyncDerived(this.runningApps, async (apps) =>
    apps
      .filter(
        (app) =>
          app.installed_app_id.startsWith("applet#")
      )
      .map((app) => appletHashFromAppId(app.installed_app_id))
  );

  installedApplets = asyncDerived(this.installedApps, async (apps) =>
    apps
      .filter(
        (app) =>
          app.installed_app_id.startsWith("applet#")
      )
      .map((app) => appletHashFromAppId(app.installed_app_id))
  );

  isInstalled = new LazyHoloHashMap((appletHash: EntryHash) => {
    this.installedApps.reload(); // required after fresh installation of app
    return asyncDerived(
      this.installedApplets,
      (appletsHashes) => !!appletsHashes.find(
          (hash) => hash.toString() === appletHash.toString()
        )
    );
  });

  isRunning = new LazyHoloHashMap((appletHash: EntryHash) =>
    asyncDerived(
      this.runningApplets,
      (appletsHashes) =>
        !!appletsHashes.find(
          (hash) => hash.toString() === appletHash.toString()
        )
    )
  );
}


