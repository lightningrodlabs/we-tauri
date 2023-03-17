import { hashProperty } from "@holochain-open-dev/elements";
import { EntryHash } from "@holochain/client";
import { localized } from "@lit/localize";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { weStyles } from "../../shared-styles.js";
import { GroupView } from "./group-view.js";

@localized()
export class GroupAppletBlock extends ScopedElementsMixin(LitElement) {
  @property(hashProperty("applet-instance-hash"))
  appletInstanceHash!: EntryHash;

  @property()
  block!: string;

  render() {
    return html`<group-view
      .view=${{ type: "block", block: this.block }}
      .appletInstanceHash=${this.appletInstanceHash}
      style="flex: 1"
    ></group-view>`;
  }

  static get scopedElements() {
    return {
      "group-view": GroupView,
    };
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
