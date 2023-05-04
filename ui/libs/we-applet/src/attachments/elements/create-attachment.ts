import {
  hashProperty,
  notifyError,
  sharedStyles,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import { consume } from "@lit-labs/context";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { mdiAttachmentPlus } from "@mdi/js";
import { msg, localized } from "@lit/localize";
import { lazyLoad, StoreSubscriber } from "@holochain-open-dev/stores";
import { AnyDhtHash } from "@holochain/client";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
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
import { getAppletsInfosAndGroupsProfiles } from "../../utils";

@localized()
@customElement("create-attachment")
export class CreateAttachment extends LitElement {
  @consume({ context: attachmentsStoreContext, subscribe: true })
  attachmentsStore!: AttachmentsStore;

  @consume({ context: weServicesContext, subscribe: true })
  weServices!: WeServices;

  @property(hashProperty("hash"))
  hash!: AnyDhtHash;

  appletsInfosAndGroupsProfiles = new StoreSubscriber(
    this,
    () =>
      lazyLoad(async () =>
        getAppletsInfosAndGroupsProfiles(
          this.weServices,
          Array.from(this.weServices.attachmentTypes.keys())
        )
      ),
    () => []
  );

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

  renderMenuItems() {
    switch (this.appletsInfosAndGroupsProfiles.value.status) {
      case "pending":
        return Array(3).map(
          () => html`<sl-menu-item><sl-skeleton></sl-skeleton></sl-menu-item>`
        );

      case "complete":
        const { appletsInfos, groupsProfiles } =
          this.appletsInfosAndGroupsProfiles.value.value;

        return Array.from(this.weServices.attachmentTypes.entries()).map(
          ([appletId, attachmentTypes]) =>
            Object.entries(attachmentTypes).map(
              ([name, attachmentType]) => html`
                <sl-menu-item
                  @click=${() => this.createAttachment(attachmentType)}
                >
                  <sl-icon
                    slot="prefix"
                    .src=${attachmentType.icon_src}
                  ></sl-icon>
                  ${attachmentType.label}
                  <div slot="suffix" class="row" style="align-items: center">
                    <span style="margin-right: 8px">${msg(" in ")}</span>
                    ${appletsInfos
                      .get(appletId)
                      ?.groupsIds.map(
                        (groupId) => html`
                          <img
                            .src=${groupsProfiles.get(groupId)?.logo_src}
                            style="height: 16px; width: 16px; margin-right: 4px;"
                          />
                        `
                      )}
                    <span class="placeholder">
                      ${appletsInfos.get(appletId)?.appletName}</span
                    >
                  </div>
                </sl-menu-item>
              `
            )
        );

      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the attachment types")}
        ></display-error>`;
    }
  }

  render() {
    return html`
      <sl-dropdown>
        <sl-icon-button slot="trigger" .src=${wrapPathInSvg(mdiAttachmentPlus)}>
        </sl-icon-button>

        <sl-menu> ${this.renderMenuItems()} </sl-menu>
      </sl-dropdown>
    `;
  }

  static styles = [sharedStyles];
}
