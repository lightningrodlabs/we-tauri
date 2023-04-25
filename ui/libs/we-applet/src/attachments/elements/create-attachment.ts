import {
  hashProperty,
  notifyError,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import { consume } from "@lit-labs/context";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { mdiAttachmentPlus } from "@mdi/js";
import { msg } from "@lit/localize";
import { AnyDhtHash } from "@holochain/client";

import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/dropdown/dropdown.js";
import "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/menu/menu.js";
import "@shoelace-style/shoelace/dist/components/menu-item/menu-item.js";
import "@shoelace-style/shoelace/dist/components/menu-label/menu-label.js";
import "@shoelace-style/shoelace/dist/components/divider/divider.js";

import { AttachmentsStore } from "../attachments-store";
import { attachmentsStoreContext } from "../context";
import { weServicesContext } from "../../context";
import { AttachmentType, WeServices } from "../../types";

@customElement("create-attachment")
export class CreateAttachment extends LitElement {
  @consume({ context: attachmentsStoreContext, subscribe: true })
  attachmentsStore!: AttachmentsStore;

  @consume({ context: weServicesContext, subscribe: true })
  weServices!: WeServices;

  @property(hashProperty("hash"))
  hash!: AnyDhtHash;

  async createAttachment(attachmentType: AttachmentType) {
    try {
      const hrlWithContext = await attachmentType.create([
        this.attachmentsStore.client.dnaHash,
        this.hash,
      ]);

      await this.attachmentsStore.client.addAttachment(
        this.hash,
        hrlWithContext
      );
      this.weServices.openViews.openHrl(
        hrlWithContext.hrl,
        hrlWithContext.context
      );
    } catch (e) {
      notifyError(msg("Error creating the attachment"));
      console.error(e);
    }
  }

  render() {
    return html`
      <sl-tooltip .label=${msg("Create Attachment")}>
        <sl-dropdown>
          <sl-button slot="trigger" variant="default" size="medium" circle
            ><sl-icon .src=${wrapPathInSvg(mdiAttachmentPlus)}></sl-icon
          ></sl-button>

          <sl-menu>
            ${this.weServices.groupsAttachmentTypes.map(
              (ga) => html`<sl-menu-label>${ga.groupInfo.name}</sl-menu-label>
                ${ga.appletsAttachmentTypes.map((appletAttachments) =>
                  Object.entries(appletAttachments.attachmentTypes).map(
                    ([name, attachmentType]) => html`
                      <sl-menu-item
                        @click=${() => this.createAttachment(attachmentType)}
                      >
                        <sl-icon
                          slot="prefix"
                          .src=${attachmentType.icon_src}
                        ></sl-icon>
                        ${attachmentType.label}
                        <span slot="suffix"
                          >${msg("in")} ${appletAttachments.appletName}</span
                        >
                      </sl-menu-item>
                    `
                  )
                )} <sl-divider></sl-divider> `
            )}
          </sl-menu>
        </sl-dropdown>
      </sl-tooltip>
    `;
  }
}
