import { hashProperty, sharedStyles } from "@holochain-open-dev/elements";
import { consume } from "@lit-labs/context";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { msg } from "@lit/localize";
import { AnyDhtHash } from "@holochain/client";
import { StoreSubscriber } from "@holochain-open-dev/stores";

import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";

import { AttachmentsStore } from "../attachments-store";
import { attachmentsStoreContext } from "../context";
import { weServicesContext } from "../../context";
import { HrlWithContext, WeServices } from "../../types";

import "../../elements/hrl-link.js";

@customElement("attachments-list")
export class AttachmentsList extends LitElement {
  @consume({ context: attachmentsStoreContext, subscribe: true })
  attachmentsStore!: AttachmentsStore;

  @consume({ context: weServicesContext, subscribe: true })
  weServices!: WeServices;

  @property(hashProperty("hash"))
  hash!: AnyDhtHash;

  attachments = new StoreSubscriber(this, () =>
    this.attachmentsStore.attachments.get(this.hash)
  );

  renderAttachments(attachments: Array<HrlWithContext>) {
    return html`
      <div class="row">
        ${attachments.map(
          (attachment) =>
            html`<hrl-link
              .hrl=${attachment.hrl}
              .context=${attachment.context}
            ></hrl-link>`
        )}
      </div>
    `;
  }

  render() {
    switch (this.attachments.value.status) {
      case "pending":
        return html`<sl-skeleton></sl-skeleton><sl-skeleton></sl-skeleton
          ><sl-skeleton></sl-skeleton>`;
      case "complete":
        return this.renderAttachments(this.attachments.value.value);
      case "error":
        return html`<display-error
          tooltip
          .headline=${msg("Error fetching the attachments")}
          .error=${this.attachments.value.error.data.data}
        ></display-error>`;
    }
  }

  static styles = [sharedStyles];
}
