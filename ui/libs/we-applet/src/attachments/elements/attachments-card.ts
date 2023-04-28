import { html, LitElement } from "lit";
import { customElement } from "lit/decorators";
import { localized, msg } from "@lit/localize";

import "./attachments-list.js";
import "./create-attachment.js";

@localized()
@customElement("attachments-card")
export class AttachmentsCard extends LitElement {
  render() {
    return html`
      <sl-card>
        <span slot="header">${msg("Attachments")}</span>

        <attachments-list></attachments-list>

        <create-attachment slot="footer"></create-attachment>
      </sl-card>
    `;
  }
}
