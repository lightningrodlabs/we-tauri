import {
  AdminWebsocket,
  DnaHash,
  Location,
  ResourceMap,
  ZomeName,
} from "@holochain/client";

export interface ZomeDependency {
  name: ZomeName;
}

export type ZomeManifest = {
  name: string;
  dependencies: ZomeDependency[] | undefined;
} & Location;

export interface CoordinatorManifest {
  zomes: Array<ZomeManifest>;
}

export interface CoordinatorBundle {
  manifest: CoordinatorManifest;
  resources: ResourceMap;
}

export type CoordinatorSource =
  | {
      path: string;
    }
  | {
      bundle: CoordinatorBundle;
    };

export type UpdateCoordinatorsPayload = {
  dna_hash: DnaHash;
} & CoordinatorSource;

export async function updateCoordinators(
  adminWs: AdminWebsocket,
  payload: UpdateCoordinatorsPayload
): Promise<void> {
  await adminWs._requester("update_coordinators")(payload);
}
