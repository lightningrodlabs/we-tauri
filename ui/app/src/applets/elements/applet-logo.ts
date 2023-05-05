import { completed, pipe, StoreSubscriber } from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { msg } from "@lit/localize";
import { GroupProfile } from "@lightningrodlabs/we-applet";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";

import { weStoreContext } from "../../context";
import { WeStore } from "../../we-store";
import { hashProperty } from "@holochain-open-dev/elements";
import { EntryHash } from "@holochain/client";

@customElement("applet-logo")
export class AppletLogo extends LitElement {
  @consume({ context: weStoreContext, subscribe: true })
  weStore!: WeStore;

  @property(hashProperty("applet-hash"))
  appletHash!: EntryHash;

  appletLogo = new StoreSubscriber(
    this,
    () =>
      pipe(this.weStore.applets.get(this.appletHash), (appletStore) =>
        appletStore ? appletStore.logo : completed(undefined)
      ),
    () => [this.appletHash]
  );

  renderLogo(logo: string | undefined) {
    if (!logo) return html``;

    return html`
      <img
        style="height: 64px; width: 64px; margin-bottom: 8px; border-radius: 8px"
        .src=${logo}
      />
    `;
  }

  render() {
    switch (this.appletLogo.value.status) {
      case "pending":
        return html`<sl-skeleton
          style="width: height: 64px; width: 64px; border-radius: 8px"
        ></sl-skeleton> `;
      case "complete":
        return this.renderLogo(this.appletLogo.value.value);
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the applet logo")}
          .error=${this.appletLogo.value.error}
        ></display-error>`;
    }
  }
}
