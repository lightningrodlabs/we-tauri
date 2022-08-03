import { createContext } from "@lit-labs/context";
import { MatrixStore } from "./matrix-store";
import { WeGroupStore } from "./we-group-store";

export const matrixContext = createContext<MatrixStore>("hc_zome_we/matrix_context");

export const weGroupContext = createContext<WeGroupStore>("hc_zome_we/we_group_context");