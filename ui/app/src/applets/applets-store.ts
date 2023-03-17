import { lazyLoadAndPoll } from "@holochain-open-dev/stores";
import {
  AdminWebsocket,
  AppAgentClient,
  AppInfo,
  encodeHashToBase64,
  EntryHash,
  InstalledAppId,
} from "@holochain/client";
import {
  fetchWebHapp,
  getAllAppsWithGui,
} from "../processes/devhub/get-happs.js";
import { writeBinaryFile, BaseDirectory } from "@tauri-apps/api/fs";
import { invoke } from "@tauri-apps/api";

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
  ): Promise<AppInfo> {
    const compressedWebHapp = await fetchWebHapp(
      this.devhubClient,
      "hApp", // This is chosen arbitrarily at the moment
      devhubHappReleaseHash,
      devhubGuiReleaseHash
    );

    // Write a binary file to the `$APPDATA/avatar.png` path
    await writeBinaryFile(
      { path: `webhapps/${appId}.webhapp`, contents: compressedWebHapp },
      { dir: BaseDirectory.AppData }
    );

    const appInfo: AppInfo = await invoke("install_applet", {
      appId,
      networkSeed,
      membraneProofs: {},
      happReleaseHash: encodeHashToBase64(devhubHappReleaseHash),
      guiReleaseHash: encodeHashToBase64(devhubGuiReleaseHash),
      agentPubKey: encodeHashToBase64(this.devhubClient.myPubKey),
    });

    return appInfo;
  }
}
