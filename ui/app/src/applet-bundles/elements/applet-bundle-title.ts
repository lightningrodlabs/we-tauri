import {
  AsyncReadable,
  join,
  StoreSubscriber,
} from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { msg } from "@lit/localize";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";

import { EntryHash } from "@holochain/client";
import { hashProperty } from "@holochain-open-dev/elements";

import { WeStore } from "../../we-store";
import { weStoreContext } from "../../context";
import { weStyles } from "../../shared-styles";
import { ContentAddress } from "../../processes/devhub/get-happs";
import { HappReleaseEntry } from "../../processes/devhub/types";

@customElement("applet-bundle-title")
export class AppletBundleTitle extends LitElement {
  @consume({ context: weStoreContext, subscribe: true })
  _weStore!: WeStore;

  @property(hashProperty("applet-bundle-hash"))
  appletBundleHash!: EntryHash;

  appletBundle = new StoreSubscriber(
    this,
    () =>
      join([
        this._weStore.appletBundlesStore.appletBundles.get(
          this.appletBundleHash
        ),
        this._weStore.appletBundlesStore.appletBundleLogo.get(
          this.appletBundleHash
        ),
      ]) as AsyncReadable<
        [
          [string, ContentAddress<HappReleaseEntry>] | undefined,
          string | undefined
        ]
      >,
    () => [this.appletBundleHash]
  );

  renderTitle([appletBundle, appletBundleLogo]: [
    [string, ContentAddress<HappReleaseEntry>] | undefined,
    string | undefined
  ]) {
    if (!appletBundle) return html``;

    return html` <div class="row">
      <img
        .src=${appletBundleLogo}
        style="height: 16px; width: 16px; display: flex; margin-right: 4px"
      />
      <span style="color: rgb(119, 119, 119)">${appletBundle[0]}</span>
    </div>`;
  }

  render() {
    switch (this.appletBundle.value.status) {
      case "pending":
        return html``;
      case "complete":
        return this.renderTitle(this.appletBundle.value.value);
      case "error":
        return html`<display-error
          tooltip
          .headline=${msg(
            "Error fetching the information about the applet bundle"
          )}
          .error=${this.appletBundle.value.error}
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
