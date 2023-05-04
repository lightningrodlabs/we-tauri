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
        <div class="row" style="align-items: center" slot="header">
          <span style="flex: 1" class="title">${msg("Attachments")}</span>

          <create-attachment .hash=${this.hash}></create-attachment>
        </div>

        <attachments-list .hash=${this.hash} style="flex: 1"></attachments-list>
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
