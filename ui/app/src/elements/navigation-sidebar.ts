import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement } from "lit";
import { GroupSidebar } from "./group-sidebar.js";

export class NavigationSidebar extends ScopedElementsMixin(LitElement) {
  render() {
    return html`<group-sidebar></group-sidebar>`;
  }

  static get scopedElements() {
    return {
      "group-sidebar": GroupSidebar,
    };
  }
}
