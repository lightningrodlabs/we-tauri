import { html } from "lit";

import { PageTree } from "@rocket/engine";

export const pageTree = new PageTree();
await pageTree.restore(
  new URL("../../pages/pageTreeData.rocketGenerated.json", import.meta.url)
);

export const layoutData = {
  pageTree,
  titleWrapperFn: (title) => title,
  description: "Welcome to the Rocket Spark Landing Page example",
  siteName: "We",

  head__150: html`<link rel="stylesheet" href="resolve:#src/css/page.css" />`,

  footer__10: html`
    <rocket-content-area>
      <rocket-columns>
        <div>
          We is a project by lightningrodlabs<br />
          <a href="https://lightningrodlabs.org">https://lightningrodlabs.org</a
          ><br />
        </div>
      </rocket-columns>
    </rocket-content-area>
  `,
};
