import { createContext } from "@lit-labs/context";
import { MatrixStore } from "./matrix-store";

export const matrixContext = createContext<MatrixStore>("hc_zome_we/matrix_context");