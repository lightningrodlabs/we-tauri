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
import { AnyDhtHash, EntryHash } from "@holochain/client";

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

// TODO: remove alternative menu when sl-menu includes submenus
import "@material/web/menu/menu.js";
import "@material/web/menu/sub-menu-item.js";
import "@material/web/menu/menu-item.js";

import {
  weServicesContext,
  WeServices,
  AttachmentType,
  getAppletsInfosAndGroupsProfiles,
} from "@lightningrodlabs/we-applet";
import { HoloHashMap } from "@holochain-open-dev/utils";

import { AttachmentsStore } from "../attachments-store";
import { attachmentsStoreContext } from "../context";

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
      const dnaHash = await this.attachmentsStore.client.getDnaHash();
      const hrlWithContext = await attachmentType.create([dnaHash, this.hash]);

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
          () =>
            html`<md-menu-item disabled
              ><sl-skeleton></sl-skeleton
            ></md-menu-item>`
        );

      case "complete":
        const { appletsInfos, groupsProfiles } =
          this.appletsInfosAndGroupsProfiles.value.value;

        const attachments = Array.from(
          this.weServices.attachmentTypes.entries()
        );
        if (attachments.length === 0)
          return html`<md-menu-item disabled
            >${msg("There are no attachment types yet.")}</md-menu-item
          >`;

        const groupAttachmentTypes: Record<
          string,
          HoloHashMap<EntryHash, AttachmentType>
        > = {};

        for (const [appletId, attachmentTypes] of attachments) {
          for (const [name, attachmentType] of Object.entries(
            attachmentTypes
          )) {
            const stringifyedAttachmentType = JSON.stringify({
              label: attachmentType.label,
              icon_src: attachmentType.icon_src,
            });
            if (!groupAttachmentTypes[stringifyedAttachmentType]) {
              groupAttachmentTypes[stringifyedAttachmentType] =
                new HoloHashMap();
            }
            groupAttachmentTypes[stringifyedAttachmentType].set(
              appletId,
              attachmentType
            );
          }
        }

        return Object.entries(groupAttachmentTypes).map(
          ([stringifiedAttachmentType, attachmentTypesByApplet]) => {
            const { label, icon_src } = JSON.parse(stringifiedAttachmentType);

            return html` <md-sub-menu-item .headline=${label}>
              <sl-icon
                slot="start"
                .src=${icon_src}
                style="margin-left: 16px"
              ></sl-icon>
              <md-menu slot="submenu">
                ${Array.from(attachmentTypesByApplet.entries()).map(
                  ([appletId, attachmentType]) => html`
                    <md-menu-item
                      .headline=${appletsInfos.get(appletId)?.appletName}
                      @click=${() => this.createAttachment(attachmentType)}
                    >
                      ${appletsInfos
                        .get(appletId)
                        ?.groupsIds.map(
                          (groupId) => html`
                            <img
                              slot="start"
                              .src=${groupsProfiles.get(groupId)?.logo_src}
                              style="height: 32px; width: 32px; border-radius: 50%; margin-right: 4px; margin-left: 16px"
                            />
                          `
                        )}
                    </md-menu-item>
                  `
                )}
              </md-menu>
            </md-sub-menu-item>`;
          }
        );

      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the attachment types")}
        ></display-error>`;
    }
  }

  render() {
    return html`
      <sl-icon-button
        .src=${wrapPathInSvg(mdiAttachmentPlus)}
        @click=${(e) => {
          const menu = this.shadowRoot?.getElementById("menu") as any;
          menu.anchor = e.target;
          setTimeout(() => {
            menu.show();
          }, 10);
        }}
      >
      </sl-icon-button>

      <md-menu fixed id="menu" has-overflow>
        ${this.renderMenuItems()}
      </md-menu>
    `;
  }

  static styles = [sharedStyles];
}
