import { createContext } from "@lit-labs/context";
import { GroupStore } from "./groups/group-store";
import { WeStore } from "./we-store";

export const weStoreContext = createContext<WeStore>(
  "hc_zome_we/we_store_context"
);
export const groupStoreContext = createContext<GroupStore>(
  "hc_zome_we/group_context"
);
