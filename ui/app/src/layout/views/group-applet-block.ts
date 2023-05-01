import { hashProperty } from "@holochain-open-dev/elements";
import { EntryHash } from "@holochain/client";
import { localized } from "@lit/localize";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { weStyles } from "../../shared-styles.js";
import "./group-view.js";

@localized()
@customElement("group-applet-block")
export class GroupAppletBlock extends LitElement {
  @property(hashProperty("applet-hash"))
  appletHash!: EntryHash;

  @property()
  block!: string;

  @property()
  context!: any;

  render() {
    return html`<group-view
      .view=${{ type: "block", block: this.block, context: this.context }}
      .appletHash=${this.appletHash}
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
