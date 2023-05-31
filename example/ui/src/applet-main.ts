import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";

import { localized, msg } from "@lit/localize";
import { sharedStyles } from "@holochain-open-dev/elements";

import "./elements/all-posts.js";
import "./elements/create-post.js";

@localized()
@customElement("applet-main")
export class AppletMain extends LitElement {
  render() {
    return html`
      <create-post></create-post>
      <all-posts></all-posts>
    `;
  }

  static styles = [
    css`
      :host {
        display: flex;
        flex: 1;
      }
    `,
    sharedStyles,
  ];
}
