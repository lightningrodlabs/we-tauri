import { lazyLoadAndPoll } from "@holochain-open-dev/stores";
import {
  AdminWebsocket,
  AppAgentClient,
  AppInfo,
  encodeHashToBase64,
  EntryHash,
  InstalledAppId,
} from "@holochain/client";
import { invoke } from "@tauri-apps/api";
import { getAllAppsWithGui } from "../processes/devhub/get-happs.js";
import { toSrc } from "../processes/import-logsrc-from-file.js";

export class AppletsStore {
  constructor(
    public devhubClient: AppAgentClient,
    public adminWebsocket: AdminWebsocket
  ) {}

  installableApplets = lazyLoadAndPoll(
    async () => getAllAppsWithGui(this.devhubClient),
    5000
  );

  async installApplet(
    devhubHappReleaseHash: EntryHash,
    devhubGuiReleaseHash: EntryHash,
    appId: InstalledAppId,
    networkSeed: string | undefined
  ): Promise<[AppInfo, string | undefined]> {
    const [appInfo, iconBytes] = await invoke("install_applet", {
      appId,
      networkSeed,
      membraneProofs: {},
      happReleaseHash: encodeHashToBase64(devhubHappReleaseHash),
      guiReleaseHash: encodeHashToBase64(devhubGuiReleaseHash),
      agentPubKey: encodeHashToBase64(this.devhubClient.myPubKey),
    });

    return [appInfo, toSrc(new Uint8Array(iconBytes))];
  }
}
