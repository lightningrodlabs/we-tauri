import { HoloHashMap } from "@holochain-open-dev/utils";
import { EntryHash } from "@holochain/client";
import { AttachmentType, WeServices } from "./types";

export const weServicesMock: WeServices = {
  appletInfo: async () => undefined,
  attachmentTypes: new HoloHashMap<EntryHash, Record<string, AttachmentType>>(),
  entryInfo: async () => undefined,
  groupProfile: async () => undefined,
  openViews: {
    openAppletMain: () => {},
    openAppletBlock: () => {},
    openCrossAppletMain: () => {},
    openCrossAppletBlock: () => {},
    openHrl: () => {},
  },
  search: async () => [],
  notifyWe: async () => console.log("Sending mock notification.")
};
