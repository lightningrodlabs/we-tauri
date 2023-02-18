import { DnaHash } from "@holochain/client";
import { createContext } from "@lit-labs/context";
import { WeStore } from "./we-store";

export const weStoreContext = createContext<WeStore>("hc_zome_we/we_context");
export const weGroupContext = createContext<DnaHash>(
  "hc_zome_we/we_group_id_context"
);
