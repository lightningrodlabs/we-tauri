import { CoordinatorSource } from "../update-coordinators";
import { HRL_LOCATOR_COORDINATOR_ZOME } from "./locate-hrl";
//@ts-ignore
import ZOME from "../../../../../target/wasm32-unknown-unknown/release/hrl_locator.wasm?url";

export async function hrlLocatorZome(): Promise<CoordinatorSource> {
  const wasm = await fetch(ZOME);
  const arrayBuffer = await wasm.arrayBuffer();

  return {
    bundle: {
      manifest: {
        zomes: [
          {
            bundled: "hrl_locator",
            name: HRL_LOCATOR_COORDINATOR_ZOME,
            dependencies: [],
          },
        ],
      },
      resources: {
        hrl_locator: new Uint8Array(arrayBuffer),
      },
    },
  };
}
