import {
  asyncDerived,
  lazyLoadAndPoll,
  manualReloadStore,
  pipe,
  retryUntilSuccess,
  toPromise,
} from "@holochain-open-dev/stores";
import { LazyHoloHashMap } from "@holochain-open-dev/utils";
import {
  AdminWebsocket,
  AppAgentClient,
  AppInfo,
  decodeHashFromBase64,
  encodeHashToBase64,
  EntryHash,
} from "@holochain/client";
import { invoke } from "@tauri-apps/api";
import { AppletStore } from "../applets/applet-store.js";
import { Applet } from "../applets/types.js";
import { getAllApps } from "../processes/appstore/get-happs.js";
import { ConductorInfo } from "../tauri.js";
import { isAppRunning } from "../utils.js";

export class AppletBundlesStore {
  constructor(
    public appstoreClient: AppAgentClient,
    public weClient: AppAgentClient,
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

  async installApplet(appletHash: EntryHash, applet: Applet): Promise<AppInfo> {
    const appId = encodeHashToBase64(appletHash);

    const appEntry = await toPromise(
      this.appletBundles.get(applet.appstore_app_hash)
    );

    if (!appEntry) throw new Error("Couldn't find app entry");

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
      happReleaseHash: encodeHashToBase64(appEntry.content.devhub_address.happ),
      guiReleaseHash: encodeHashToBase64(appEntry.content.devhub_address.gui!),
      devhubDnaHash: encodeHashToBase64(appEntry.content.devhub_address.dna),
      agentPubKey: encodeHashToBase64(this.appstoreClient.myPubKey),
    });

    await this.installedApps.reload();

    return appInfo;
  }

  async uninstallApplet(appletHash: EntryHash) {
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
      this.conductorInfo.we_app_id,
      this.conductorInfo.devhub_app_id,
      this.conductorInfo.appstore_app_id,
    ];
    return apps
      .filter((app) => !nonAppletsApps.includes(app.installed_app_id))
      .map((app) => decodeHashFromBase64(app.installed_app_id));
  });

  isInstalled = new LazyHoloHashMap((appletHash: EntryHash) =>
    asyncDerived(this.installedApplets, (appletsHashes) => {
      return !!appletsHashes.find(
        (hash) => hash.toString() === appletHash.toString()
      );
    })
  );
}
