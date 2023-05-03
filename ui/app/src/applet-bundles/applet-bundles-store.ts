import { asyncDerived, lazyLoadAndPoll } from "@holochain-open-dev/stores";
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
import { manualReloadStore } from "../we-store.js";

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

  async installApplet(appletHash: EntryHash, applet: Applet) {
    return this.installAppletBundle(
      applet.devhub_happ_release_hash,
      applet.devhub_gui_release_hash,
      encodeHashToBase64(appletHash),
      applet.network_seed
    );
  }

  async installAppletBundle(
    devhubHappReleaseHash: EntryHash,
    devhubGuiReleaseHash: EntryHash,
    appId: InstalledAppId,
    networkSeed: string | undefined
  ): Promise<[AppInfo, string | undefined]> {
    const [appInfo, iconBytes] = await invoke("install_applet_bundle", {
      appId,
      networkSeed,
      membraneProofs: {},
      happReleaseHash: encodeHashToBase64(devhubHappReleaseHash),
      guiReleaseHash: encodeHashToBase64(devhubGuiReleaseHash),
      agentPubKey: encodeHashToBase64(this.devhubClient.myPubKey),
    });

    await this.installedApps.reload();

    return [appInfo, toSrc(new Uint8Array(iconBytes))];
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
