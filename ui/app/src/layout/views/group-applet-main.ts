import { hashProperty } from "@holochain-open-dev/elements";
import { EntryHash } from "@holochain/client";
import { localized } from "@lit/localize";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { weStyles } from "../../shared-styles.js";
import "./group-view.js";

@localized()
@customElement("group-applet-main")
export class GroupAppletMain extends LitElement {
  @property(hashProperty("applet-instance-hash"))
  appletInstanceHash!: EntryHash;

  render() {
    return html`<group-view
      .view=${{ type: "main" }}
      .appletInstanceHash=${this.appletInstanceHash}
      style="flex: 1"
    ></group-view>`;
  }

  static styles = [
    css`
      :host {
        display: flex;
        flex: 1;
      }
    `,
    weStyles,
  ];
}
