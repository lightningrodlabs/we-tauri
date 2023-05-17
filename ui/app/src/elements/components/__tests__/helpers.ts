import { fixture, html } from "@open-wc/testing";

export const stateful = async (component) => fixture(html`
<test-harness>${component}</test-harness>
`)