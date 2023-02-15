import { LazyHoloHashMap } from "@holochain-open-dev/utils";
import { AppAgentClient, EntryHash } from "@holochain/client";
import { WeApplet } from "@lightningrodlabs/we-applet";
import { AppletsGuiClient } from "./applets-gui-client";
import { importModuleFromFile } from "./import-module-from-file";

export class AppletsStore {
  public appletsGuiClient: AppletsGuiClient;

  constructor(public appAgentClient: AppAgentClient, public roleName: string) {
    this.appletsGuiClient = new AppletsGuiClient(appAgentClient, roleName);
  }

  appletsGui = new LazyHoloHashMap(async (devhubHappEntryHash: EntryHash) => {
    const appletGuiFile = await this.appletsGuiClient.queryAppletGui(
      devhubHappEntryHash
    );

    // If it doesn't exist yet, download it and commit it

    const file = new File(
      [new Blob([new Uint8Array(appletGuiFile.gui)])],
      "filename"
    );

    const mod = await importModuleFromFile(file);
    return mod.default as WeApplet;
  });
}
