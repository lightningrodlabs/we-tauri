import {
  asyncDerived,
  lazyLoad,
  lazyLoadAndPoll,
  manualReloadStore,
  pipe,
  toPromise,
} from "@holochain-open-dev/stores";
import { LazyHoloHashMap } from "@holochain-open-dev/utils";
import {
  AdminWebsocket,
  AppAgentClient,
  AppInfo,
  AppStatusFilter,
  decodeHashFromBase64,
  encodeHashToBase64,
  EntryHash,
  InstalledAppId,
} from "@holochain/client";
import { invoke } from "@tauri-apps/api";
import { Applet } from "../applets/types.js";
import {
  ContentAddress,
  getAllAppsWithGui,
  getLatestRelease,
} from "../processes/devhub/get-happs.js";
import { HappReleaseEntry } from "../processes/devhub/types.js";
import { toSrc } from "../processes/import-logsrc-from-file.js";
import { isAppRunning } from "../utils.js";

export class AppletBundlesStore {
  constructor(
    public devhubClient: AppAgentClient,
    public weClient: AppAgentClient,
    public adminWebsocket: AdminWebsocket
  ) {}

  allAppletBundles = lazyLoadAndPoll(
    async () => getAllAppsWithGui(this.devhubClient),
    30000
  );

  appletBundles = new LazyHoloHashMap((appletBundleHash: EntryHash) =>
    asyncDerived(this.allAppletBundles, async (appletBundles) => {
      const appletBundle = appletBundles
        .map(
          (b) =>
            [b.app.content.title, getLatestRelease(b)] as [
              string,
              ContentAddress<HappReleaseEntry>
            ]
        )
        .find(([name, b]) => b.id.toString() === appletBundleHash.toString());
      return appletBundle;
    })
  );

  appletBundleLogo = new LazyHoloHashMap((appletBundleHash: EntryHash) =>
    pipe(this.appletBundles.get(appletBundleHash), (bundleWithName) =>
      lazyLoadAndPoll(async () => {
        if (!bundleWithName) throw new Error("Can't find app bundle");
        const appletBundle = bundleWithName[1];

        const guiReleaseHash = appletBundle?.content.official_gui;

        if (!guiReleaseHash)
          throw new Error("This app doesn't have a UI release");

        return new Promise((resolve, reject) => {
          invoke("fetch_icon", {
            happReleaseHashB64: encodeHashToBase64(appletBundleHash),
            guiReleaseHashB64: encodeHashToBase64(guiReleaseHash),
          })
            .then((bytes: any) => resolve(toSrc(new Uint8Array(bytes))))
            .catch(reject);

          setTimeout(() => resolve(undefined), 1000);
        });
      }, 5000)
    )
  );

  async installApplet(appletHash: EntryHash, applet: Applet) {
    return this.installAppletBundle(
      applet.devhub_happ_release_hash,
      applet.devhub_gui_release_hash,
      encodeHashToBase64(appletHash),
      applet.network_seed
    );
  }

  async uninstallApplet(appletHash: EntryHash) {
    await this.adminWebsocket.disableApp({
      installed_app_id: encodeHashToBase64(appletHash),
    });

    await this.installedApps.reload();
  }

  async installAppletBundle(
    devhubHappReleaseHash: EntryHash,
    devhubGuiReleaseHash: EntryHash,
    appId: InstalledAppId,
    networkSeed: string | undefined
  ): Promise<AppInfo> {
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
      networkSeed,
      membraneProofs: {},
      happReleaseHash: encodeHashToBase64(devhubHappReleaseHash),
      guiReleaseHash: encodeHashToBase64(devhubGuiReleaseHash),
      agentPubKey: encodeHashToBase64(this.devhubClient.myPubKey),
    });

    await this.installedApps.reload();

    return appInfo;
  }

  installedApps = manualReloadStore(async () => {
    const apps = await this.adminWebsocket.listApps({});
    return apps.filter((app) => isAppRunning(app));
  });

  installedApplets = asyncDerived(this.installedApps, async (apps) => {
    const weAppInfo = await this.weClient.appInfo();
    const devhubAppInfo = await this.devhubClient.appInfo();

    return apps
      .filter(
        (app) =>
          app.installed_app_id !== weAppInfo.installed_app_id &&
          app.installed_app_id !== devhubAppInfo.installed_app_id
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
