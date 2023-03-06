import { createContext } from "@lit-labs/context";
import { GenericGroupStore } from "./group-store";

export const groupStoreContext = createContext<GenericGroupStore<any>>(
  "hc_zome_we/group_context"
);
