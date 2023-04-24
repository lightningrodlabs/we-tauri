import { createContext } from "@lit-labs/context";
import { GroupStore } from "./group-store";

export const groupStoreContext = createContext<GroupStore>(
  "hc_zome_we/group_context"
);
