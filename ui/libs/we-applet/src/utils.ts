import { HoloHashMap } from "@holochain-open-dev/utils";
import { EntryHash } from "@holochain/client";
import { DnaHash } from "@holochain/client";
import { AppletInfo, GroupProfile, WeServices } from "./types";

export async function getAppletsInfosAndGroupsProfiles(
  services: WeServices,
  appletsIds: EntryHash[]
): Promise<{
  appletsInfos: ReadonlyMap<EntryHash, AppletInfo>;
  groupsProfiles: ReadonlyMap<DnaHash, GroupProfile>;
}> {
  const groupsProfiles = new HoloHashMap<DnaHash, GroupProfile>();
  const appletsInfos = new HoloHashMap<EntryHash, AppletInfo>();

  for (const appletId of appletsIds) {
    const appletInfo = await services.appletInfo(appletId);
    if (appletInfo) {
      appletsInfos.set(appletId, appletInfo);

      for (const groupId of appletInfo.groupsIds) {
        if (!groupsProfiles.has(groupId)) {
          const groupProfile = await services.groupProfile(groupId);

          if (groupProfile) {
            groupsProfiles.set(groupId, groupProfile);
          }
        }
      }
    }
  }

  return {
    groupsProfiles,
    appletsInfos,
  };
}
