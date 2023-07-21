import {
  asyncDerived,
  lazyLoadAndPoll,
  manualReloadStore,
  pipe,
  retryUntilSuccess,
  toPromise,
} from "@holochain-open-dev/stores";
import { hash, HashType, LazyHoloHashMap } from "@holochain-open-dev/utils";
import {
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
import { isAppRunning } from "../utils.js";

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

  appletBundles = new LazyHoloHashMap((appletBundleHash: EntryHash) =>
    asyncDerived(this.allAppletBundles, async (appletBundles) => {
      const appletBundle = appletBundles.find(
        (app) => app.id.toString() === appletBundleHash.toString()
      );
      return appletBundle;
    })
  );

  appletBundleLogo = new LazyHoloHashMap((appletBundleHash: EntryHash) =>
    pipe(this.appletBundles.get(appletBundleHash), (appEntry) =>
      retryUntilSuccess(async () => {
        if (!appEntry) throw new Error("Can't find app bundle");

        const icon: string = await invoke("fetch_icon", {
          appEntryHashB64: encodeHashToBase64(appEntry.id),
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
    const appId = encodeHashToBase64(appletHash);

    // Trigger the download of the icon
    await toPromise(this.appletBundleLogo.get(applet.appstore_app_hash));

    const installedApps = await toPromise(this.installedApps);

    const appletInfo = installedApps.find(
      (app) => app.installed_app_id === appId
    );

    if (appletInfo) {
      await this.adminWebsocket.enableApp({
        installed_app_id: appId,
      });
      return appletInfo;
    }

    const appInfo: AppInfo = await invoke("install_applet_bundle", {
      appId,
      networkSeed: applet.network_seed,
      membraneProofs: {},
      happReleaseHash: encodeHashToBase64(applet.devhub_happ_release_hash),
      guiReleaseHash: encodeHashToBase64(applet.devhub_gui_release_hash),
      devhubDnaHash: encodeHashToBase64(applet.devhub_dna_hash),
      agentPubKey: encodeHashToBase64(this.appstoreClient.myPubKey),
    });

    await this.installedApps.reload();

    return appInfo;
  }

  async disableApplet(appletHash: EntryHash) {
    const installed = await toPromise(this.isInstalled.get(appletHash));
    if (!installed) return;

    await this.adminWebsocket.disableApp({
      installed_app_id: encodeHashToBase64(appletHash),
    });

    await this.installedApps.reload();
  }

  installedApps = manualReloadStore(async () => {
    const apps = await this.adminWebsocket.listApps({});
    return apps.filter((app) => isAppRunning(app));
  });

  installedApplets = asyncDerived(this.installedApps, async (apps) => {
    const nonAppletsApps = [
      this.conductorInfo.devhub_app_id,
      this.conductorInfo.appstore_app_id,
    ];
    return apps
      .filter(
        (app) =>
          !nonAppletsApps.includes(app.installed_app_id) &&
          !app.installed_app_id.startsWith("group-")
      )
      .map((app) => decodeHashFromBase64(app.installed_app_id));
  });

  isInstalled = new LazyHoloHashMap((appletHash: EntryHash) =>
    asyncDerived(
      this.installedApplets,
      (appletsHashes) =>
        !!appletsHashes.find(
          (hash) => hash.toString() === appletHash.toString()
        )
    )
  );
}
