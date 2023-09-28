import { createContext } from "@lit-labs/context";
import { WeClient } from "./api";

export const weClientContext = createContext<WeClient>("we_client");
