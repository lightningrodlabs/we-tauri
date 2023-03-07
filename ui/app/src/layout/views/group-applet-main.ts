import { hashProperty } from "@holochain-open-dev/elements";
import { EntryHash } from "@holochain/client";
import { localized } from "@lit/localize";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { weStyles } from "../../shared-styles";
import { GroupView } from "./group-view";

@localized()
export class GroupAppletMain extends ScopedElementsMixin(LitElement) {
  @property(hashProperty("applet-instance-hash"))
  appletInstanceHash!: EntryHash;

  render() {
    return html`<group-view
      .view=${{ type: "main" }}
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
      }
    `,
    weStyles,
  ];
}
