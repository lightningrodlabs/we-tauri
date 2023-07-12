import { fixture, html } from "@open-wc/testing";

export const stateful = async (component) => fixture(html`
<dashboard-test-harness>${component}</dashboard-test-harness>
`)

export const getTagName = (component: any) => component.strings[0].split(/[<>]/)[1]

