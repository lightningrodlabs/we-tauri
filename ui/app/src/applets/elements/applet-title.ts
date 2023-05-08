import {
  asyncDeriveStore,
  AsyncReadable,
  join,
  joinAsyncMap,
  StoreSubscriber,
} from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { msg } from "@lit/localize";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";

import { EntryInfo, GroupProfile, Hrl } from "@lightningrodlabs/we-applet";
import { DnaHash, EntryHash } from "@holochain/client";
import { hashProperty } from "@holochain-open-dev/elements";
import { mapValues } from "@holochain-open-dev/utils";
import { WeStore } from "../../we-store";
import { weStoreContext } from "../../context";
import { weStyles } from "../../shared-styles";
import { AppletStore } from "../applet-store";

@customElement("applet-title")
export class AppletTitle extends LitElement {
  @consume({ context: weStoreContext, subscribe: true })
  _weStore!: WeStore;

  @property(hashProperty("applet-hash"))
  appletHash!: EntryHash;

  _applet = new StoreSubscriber(
    this,
    () =>
      join([
        this._weStore.applets.get(this.appletHash),
        asyncDeriveStore(
          this._weStore.groupsForApplet.get(this.appletHash),
          (groupsStores) =>
            joinAsyncMap(
              mapValues(groupsStores, (groupStore) => groupStore.groupProfile)
            )
        ),
      ]) as AsyncReadable<
        [AppletStore | undefined, ReadonlyMap<DnaHash, GroupProfile>]
      >,
    () => [this.appletHash]
  );

  renderTitle([appletStore, groupsProfiles]: [
    AppletStore | undefined,
    ReadonlyMap<DnaHash, GroupProfile>
  ]) {
    if (!appletStore) return html``;

    return html` <div class="row">
      ${Array.from(groupsProfiles.values()).map(
        (groupProfile) => html`
          <img
            .src=${groupProfile.logo_src}
            style="height: 16px; width: 16px; display: flex; margin-right: 4px; border-radius: 50%"
          />
        `
      )}
      <span style="color: rgb(119, 119, 119)"
        >${appletStore.applet.custom_name}</span
      >
    </div>`;
  }

  render() {
    switch (this._applet.value.status) {
      case "pending":
        return html``;
      case "complete":
        return this.renderTitle(this._applet.value.value);
      case "error":
        return html`<display-error
          tooltip
          .headline=${msg("Error fetching the information about the applet")}
          .error=${this._applet.value.error.data.data}
        ></display-error>`;
    }
  }

  static styles = [
    weStyles,
    css`
      :host {
        display: flex;
      }
    `,
  ];
}
