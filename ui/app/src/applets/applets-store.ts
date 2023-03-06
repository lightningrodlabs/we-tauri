import { lazyLoad, lazyLoadAndPoll } from "@holochain-open-dev/stores";
import { LazyHoloHashMap } from "@holochain-open-dev/utils";
import { AppAgentClient, AppBundle, EntryHash } from "@holochain/client";
import {
  fetchWebHapp,
  getAllAppsWithGui,
} from "../processes/devhub/get-happs.js";
import { AppletsGuiClient } from "./applets-gui-client.js";
import { decompressWebHapp } from "./decompress-web-happ.js";
import { GuiFile, IconSrcOption } from "./types.js";

export class AppletsStore {
  public appletsGuiClient: AppletsGuiClient;

  constructor(
    public appAgentClient: AppAgentClient,
    public roleName: string,
    public devhubClient: AppAgentClient
  ) {
    this.appletsGuiClient = new AppletsGuiClient(appAgentClient, roleName);
  }

  async fetchWebHapp(
    happEntryHash: EntryHash,
    guiEntryHash: EntryHash
  ): Promise<[AppBundle, GuiFile, IconSrcOption]> {
    const compressedWebHapp = await fetchWebHapp(
      this.devhubClient,
      "hApp", // This is chosen arbitrarily at the moment
      happEntryHash,
      guiEntryHash
    );

    return decompressWebHapp(compressedWebHapp);
  }

  installableApplets = lazyLoadAndPoll(
    async () => getAllAppsWithGui(this.devhubClient),
    5000
  );

  appletsGui = new LazyHoloHashMap((devhubHappEntryHash: EntryHash) =>
    lazyLoad(async () => {
      const appletGuiFile = await this.appletsGuiClient.queryAppletGui(
        devhubHappEntryHash
      );
      // If it doesn't exist yet, download it and commit it

      const t = await new File(
        [new Blob([new Uint8Array(appletGuiFile)])],
        "filename"
      ).text();
      return t
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\`/g, "\\`")
        .replace(/\$\{/g, "\\${");
    })
  );
}
