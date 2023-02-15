import {
  asyncDerived,
  asyncDeriveStore,
  join,
  lazyLoad,
  lazyLoadAndPoll,
} from "@holochain-open-dev/stores";
import {
  EntryHashMap,
  LazyHoloHashMap,
  LazyMap,
} from "@holochain-open-dev/utils";
import {
  AppAgentWebsocket,
  CellInfo,
  CellType,
  EntryHash,
} from "@holochain/client";
import { GroupAppletsInfo } from "../../libs/we-applet/dist";
import { AppletsStore } from "./applets/applets-store";
import { GroupStore } from "./groups/group-store";
import { AppletInstance } from "./groups/types";

export class WeStore {
  public appletsStore: AppletsStore;

  constructor(public appAgentWebsocket: AppAgentWebsocket) {
    this.appletsStore = new AppletsStore(appAgentWebsocket, "lobby");
  }

  createGroup() {}

  joinGroup() {}

  groupsRoleNames = lazyLoadAndPoll(async () => {
    const appInfo = await this.appAgentWebsocket.appInfo();
    return appInfo.cell_info["group"].map(
      (cellInfo: CellInfo) => cellInfo[CellType.Cloned].clone_id
    );
  }, 1000);

  groups = new LazyMap(
    (roleName: string) =>
      new GroupStore(this.appAgentWebsocket, roleName, this.appletsStore)
  );

  allGroups = asyncDerived([this.groupsRoleNames], ([roleNames]) =>
    roleNames.map((roleName) => this.groups.get(roleName))
  );

  allAppletsInstances = asyncDeriveStore([this.allGroups], ([allGroups]) =>
    join(
      allGroups.map((groupStore) =>
        asyncDerived(
          [groupStore.appletsInstances],
          ([instances]) =>
            [groupStore, instances] as [
              GroupStore,
              EntryHashMap<AppletInstance>
            ]
        )
      )
    )
  );

  agentCentricRenderers = new LazyHoloHashMap(
    async (devhubReleaseEntryHash: EntryHash) =>
      asyncDeriveStore([this.allAppletsInstances], ([groupAppletInstances]) =>
        lazyLoad(async () => {
          const gui = await this.appletsStore.appletsGui.get(
            devhubReleaseEntryHash
          );

          const groupInfos = await Promise.all(
            groupAppletInstances.map(([groupStore]) => groupStore.groupInfo())
          );

          // TODO: install dialog if it hasn't been installed yet

          const groupAppletsInfos = await Promise.all(
            groupAppletInstances.map(async ([groupStore, instances], index) => {
              const appletsInfo = await Promise.all(
                Array.from(instances.entries())
                  .filter(
                    ([appletInstanceHash, instance]) =>
                      instance.devhub_happ_release_hash.toString() ===
                      devhubReleaseEntryHash.toString()
                  )
                  .map(async ([appletInstanceHash, instance]) =>
                    this.appAgentWebsocket.appWebsocket.appInfo({
                      installed_app_id: await groupStore.appletAppId(
                        appletInstanceHash
                      ),
                    })
                  )
              );
              return {
                appletsInfo,
                groupServices: {
                  profilesStore: groupStore.profilesStore,
                },
                groupInfo: groupInfos[index],
              } as GroupAppletsInfo;
            })
          );

          return gui.agentCentric(
            this.appAgentWebsocket.appWebsocket,
            groupAppletsInfos
          );
        })
      )
  );
}
