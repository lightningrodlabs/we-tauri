import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { localized, msg } from "@lit/localize";
import { hashProperty, sharedStyles } from "@holochain-open-dev/elements";
import { AnyDhtHash } from "@holochain/client";

import "@shoelace-style/shoelace/dist/components/card/card.js";

import "./attachments-list.js";
import "./create-attachment.js";

@localized()
@customElement("attachments-card")
export class AttachmentsCard extends LitElement {
  @property(hashProperty("hash"))
  hash!: AnyDhtHash;

  render() {
    return html`
      <sl-card style="flex: 1">
        <span slot="header">${msg("Attachments")}</span>

        <attachments-list .hash=${this.hash}></attachments-list>

        <create-attachment .hash=${this.hash} slot="footer"></create-attachment>
      </sl-card>
    `;
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
      }
    `,
  ];
}
