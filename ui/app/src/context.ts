import { DnaHash } from "@holochain/client";
import { createContext } from "@lit-labs/context";
import { MatrixStore } from "./matrix-store";

export const matrixContext = createContext<MatrixStore>("hc_zome_we/matrix_context");
export const weGroupContext = createContext<DnaHash>("hc_zome_we/we_group_id_context")