import { createContext } from "@lit-labs/context";
import { fixture, html } from "@open-wc/testing";
import { MatrixStore } from "../../../matrix-store";

export const stateful = async (component, store, mockWeGroupId = new Uint8Array([1,2,3])) => fixture(html`
<dashboard-test-harness ._matrixStore=${store} .__weGroupId=${mockWeGroupId}>${component}</dashboard-test-harness>
`)

// Create a mock context with the mock store
export const mockContext = createContext<Partial<MatrixStore>>('hc_zome_we/matrix_context');

export const getTagName = (component: any) => component.strings[0].split(/[<>]/)[1]

