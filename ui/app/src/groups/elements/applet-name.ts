import { EntryHash } from "@holochain/client";
import { hashProperty } from "@holochain-open-dev/elements";
import { StoreSubscriber } from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { msg } from "@lit/localize";
import { EntryRecord } from "@holochain-open-dev/utils";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";

import { groupStoreContext } from "../context";
import { GroupStore } from "../group-store";
import { Applet } from "../types";

@customElement("applet-name")
export class AppletName extends LitElement {
  @consume({ context: groupStoreContext, subscribe: true })
  groupStore!: GroupStore;

  @property(hashProperty("applet-hash"))
  appletHash!: EntryHash;

  applet = new StoreSubscriber(
    this,
    () => this.groupStore.applets.get(this.appletHash),
    () => []
  );

  renderName(applet: EntryRecord<Applet> | undefined) {
    if (!applet) return html``;

    return html`<span>${applet.entry.custom_name}</span>`;
  }

  render() {
    switch (this.applet.value.status) {
      case "pending":
        return html``;
      case "complete":
        return this.renderName(this.applet.value.value);
      case "error":
        return html`<display-error
          tooltip
          .headline=${msg("Error fetching the group profile")}
          .error=${this.applet.value.error.data.data}
        ></display-error>`;
    }
  }
}
