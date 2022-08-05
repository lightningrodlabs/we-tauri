import { createContext } from "@lit-labs/context";
import { WesStore } from "./wes-store";

export const wesContext = createContext<WesStore>("hc_zome_we/wes_context");
