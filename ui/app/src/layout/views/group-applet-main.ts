import { localized } from "@lit/localize";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { css, html, LitElement } from "lit";
import { weStyles } from "../../shared-styles";
import { GroupView } from "./group-view";

@localized()
export class GroupAppletMain extends ScopedElementsMixin(LitElement) {
  render() {
    return html`<group-view .view=${{ type: "main" }}></group-view>`;
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
