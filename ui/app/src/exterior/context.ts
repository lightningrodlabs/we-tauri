import { Context, createContext } from "@holochain-open-dev/context";
import { WesStore } from "./wes-store";

export const wesContext: Context<WesStore> = createContext(
  "hc_zome_we/wes_context"
);
