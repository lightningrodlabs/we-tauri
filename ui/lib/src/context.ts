import { createContext, Context } from "@lit-labs/context";
import { WesStore } from "./wes-store";
import { WeStore } from "./we-store";

export const wesContext: Context<WesStore> = createContext(
  "hc_zome_we/wes_context"
);

export const weContext: Context<WeStore> = createContext(
  "hc_zome_we/we_context"
);
