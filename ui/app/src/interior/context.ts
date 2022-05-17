import { Context, createContext } from "@holochain-open-dev/context";
import { WeStore } from "./we-store";

export const weContext: Context<WeStore> = createContext(
  "hc_zome_we/we_context"
);
