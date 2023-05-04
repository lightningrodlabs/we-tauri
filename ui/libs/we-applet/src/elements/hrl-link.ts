import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";

import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";

import { lazyLoad, StoreSubscriber } from "@holochain-open-dev/stores";

import { weServicesContext } from "../context";
import { Hrl, WeServices } from "../types";
import { getAppletsInfosAndGroupsProfiles } from "../utils";
import { sharedStyles } from "@holochain-open-dev/elements";

@localized()
@customElement("hrl-link")
export class HrlLink extends LitElement {
  @property()
  hrl!: Hrl;

  @property()
  context: any;

  @consume({ context: weServicesContext, subscribe: true })
  weServices!: WeServices;

  info = new StoreSubscriber(
    this,
    () =>
      lazyLoad(async () => {
        const entryInfo = await this.weServices.entryInfo(this.hrl);
        if (!entryInfo) return undefined;

        const { groupsProfiles, appletsInfos } =
          await getAppletsInfosAndGroupsProfiles(this.weServices, [
            entryInfo.appletId,
          ]);

        return {
          entryInfo,
          groupsProfiles,
          appletsInfos,
        };
      }),
    () => [this.hrl]
  );

  render() {
    switch (this.info.value.status) {
      case "pending":
        return html`<sl-skeleton></sl-skeleton>`;
      case "complete":
        if (this.info.value.value === undefined) return html``; // TODO: what to put here?

        const { appletsInfos, groupsProfiles, entryInfo } =
          this.info.value.value;

        return html`<sl-button
          variant="text"
          @click=${() =>
            this.weServices.openViews.openHrl(this.hrl, this.context)}
        >
          <sl-icon slot="prefix" .src=${entryInfo.entryInfo.icon_src}></sl-icon>
          <div slot="suffix" class="row" style="align-items: center">
            <span class="placeholder" style="margin-right: 8px"
              >${msg(" in ")}</span
            >
            ${appletsInfos
              .get(entryInfo.appletId)
              ?.groupsIds.map(
                (groupId) => html`
                  <img
                    .src=${groupsProfiles.get(groupId)?.logo_src}
                    style="height: 16px; width: 16px; margin-right: 4px;"
                  />
                `
              )}
            <span class="placeholder">
              ${appletsInfos.get(entryInfo.appletId)?.appletName}</span
            >
          </div>

          ${entryInfo.entryInfo.name}
        </sl-button>`;
      case "error":
        return html`<display-error
          tooltip
          .headline=${msg("Error fetching the entry")}
          .error=${this.info.value.error.data.data}
        ></display-error>`;
    }
  }

  static styles = [sharedStyles];
}
