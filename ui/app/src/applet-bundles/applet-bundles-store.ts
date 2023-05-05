import {
  asyncDerived,
  lazyLoad,
  lazyLoadAndPoll,
  manualReloadStore,
} from "@holochain-open-dev/stores";
import { LazyHoloHashMap } from "@holochain-open-dev/utils";
import {
  AdminWebsocket,
  AppAgentClient,
  AppInfo,
  decodeHashFromBase64,
  encodeHashToBase64,
  EntryHash,
  InstalledAppId,
} from "@holochain/client";
import { invoke } from "@tauri-apps/api";
import { Applet } from "../applets/types.js";
import { getAllAppsWithGui } from "../processes/devhub/get-happs.js";
import { toSrc } from "../processes/import-logsrc-from-file.js";

export class AppletBundlesStore {
  constructor(
    public devhubClient: AppAgentClient,
    public weClient: AppAgentClient,
    public adminWebsocket: AdminWebsocket
  ) {}

  appletBundles = lazyLoadAndPoll(
    async () => getAllAppsWithGui(this.devhubClient),
    5000
  );

  appletBundleLogo = new LazyHoloHashMap(
    (appletBundleHash: EntryHash) =>
      new LazyHoloHashMap((guiReleaseHash: EntryHash) =>
        lazyLoad(async () => {
          const bytes: any = await invoke("fetch_icon", {
            happReleaseHashB64: encodeHashToBase64(appletBundleHash),
            guiReleaseHashB64: encodeHashToBase64(guiReleaseHash),
            pubKeyB64: encodeHashToBase64(this.devhubClient.myPubKey),
          });
          return toSrc(new Uint8Array(bytes));
        })
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
    await this.adminWebsocket.uninstallApp({
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

  installedApps = manualReloadStore(async () =>
    this.adminWebsocket.listApps({})
  );

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
