import {
  EntryHash,
  ActionHash,
  AppInfo,
  AppAgentClient,
} from "@holochain/client";
import { HappEntry, HappReleaseEntry } from "./types.js";

// corresponds to https://docs.rs/hc_crud_ceps/0.55.0/hc_crud/struct.Entity.html
export interface Entity<T> {
  id: EntryHash;
  action: ActionHash;
  address: EntryHash;
  ctype: EntityType;
  content: T;
}

// corresponds to https://docs.rs/hc_crud_ceps/0.55.0/hc_crud/struct.EntityType.html
export interface EntityType {
  name: string;
  model: string;
}
export interface ContentAddress<C> {
  id: EntryHash;
  address: EntryHash;
  content: C;
}

export interface AppWithReleases {
  app: ContentAddress<HappEntry>;
  releases: Array<ContentAddress<HappReleaseEntry>>;
}

export function filterByHdkVersion(
  hdkVersions: string[],
  apps: Array<AppWithReleases>
): Array<AppWithReleases> {
  const filteredReleases: Array<AppWithReleases> = apps.map((app) => ({
    app: app.app,
    releases: app.releases.filter((r) =>
      hdkVersions.includes(r.content.hdk_version)
    ),
  }));

  return filteredReleases.filter((app) => app.releases.length > 0);
}

// filtered by the supported hdk versions of that Launcher version
export async function getAllAppsWithGui(
  devhubClient: AppAgentClient
): Promise<Array<AppWithReleases>> {
  console.log("gethapps");
  const allAppsOutput = await devhubClient.callZome({
    role_name: "happs",
    fn_name: "get_happs_by_tags",
    zome_name: "happ_library",
    payload: ["we-applet"],
  });
  const allApps: Array<ContentAddress<HappEntry>> = allAppsOutput.payload;
  const promises = allApps.map((app) =>
    getAppsReleasesWithGui(devhubClient, app)
  );

  return Promise.all(promises);
}

export async function getAppsReleasesWithGui(
  devhubClient: AppAgentClient,
  app: ContentAddress<HappEntry>
): Promise<AppWithReleases> {
  const appReleasesOutput = await devhubClient.callZome({
    role_name: "happs",
    fn_name: "get_happ_releases",
    zome_name: "happ_library",
    payload: {
      for_happ: app.id,
    },
  });

  // console.log("@getAppsReleases: appReleasesOutput:", appReleasesOutput);

  const allReleases: Array<Entity<HappReleaseEntry>> =
    appReleasesOutput.payload;

  const releases: Array<ContentAddress<HappReleaseEntry>> = allReleases.map(
    (entity) => {
      return {
        id: entity.id,
        address: entity.address,
        content: entity.content,
      };
    }
  );

  const filteredReleases = releases.filter((r) => !!r.content.official_gui);

  // console.log("@getAppsReleases: filteredReleases: ", filteredReleases);
  return {
    app,
    releases: filteredReleases,
  };
}

export function getLatestRelease(
  apps: AppWithReleases
): ContentAddress<HappReleaseEntry> {
  return apps.releases.sort(
    (r1, r2) => r2.content.last_updated - r1.content.last_updated
  )[0];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(() => r(null), ms));

export async function fetchWebHapp(
  devhubClient: AppAgentClient,
  name: string,
  happReleaseEntryHash: EntryHash,
  guiReleaseEntryHash: EntryHash,
  retryCount = 3
): Promise<Uint8Array> {
  const result = await devhubClient.callZome({
    role_name: "happs",
    fn_name: "get_webhapp_package",
    zome_name: "happ_library",
    payload: {
      name,
      happ_release_id: happReleaseEntryHash,
      gui_release_id: guiReleaseEntryHash,
    },
  });

  if (result.payload.error) {
    if (retryCount === 0) {
      throw new Error(result.payload.error);
    } else {
      await sleep(1000);
      return fetchWebHapp(
        devhubClient,
        name,
        happReleaseEntryHash,
        guiReleaseEntryHash,
        retryCount - 1
      );
    }
  }

  return result.payload;
}
