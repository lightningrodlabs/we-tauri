import { fixture, html } from "@open-wc/testing";

export const stateful = async (component) => fixture(html`
<dashboard-test-harness>${component}</dashboard-test-harness>
`)