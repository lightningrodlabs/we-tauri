import { createContext } from "@lit-labs/context";
import { WeStore } from "./we-store";

export const weContext = createContext<WeStore>("hc_zome_we/we_context");
