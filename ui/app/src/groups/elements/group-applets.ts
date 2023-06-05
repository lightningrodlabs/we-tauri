import {
  AsyncReadable,
  join,
  joinAsyncMap,
  pipe,
  sliceAndJoin,
  StoreSubscriber,
} from "@holochain-open-dev/stores";
import { customElement } from "lit/decorators.js";
import { consume } from "@lit-labs/context";
import { css, html, LitElement } from "lit";
import { localized, msg } from "@lit/localize";
import { ActionHash, EntryHash } from "@holochain/client";
import { EntryRecord, slice } from "@holochain-open-dev/utils";
import { wrapPathInSvg } from "@holochain-open-dev/elements";
import { mdiToyBrickPlus } from "@mdi/js";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";

import "../../elements/sidebar-button.js";
import "../../applets/elements/applet-logo.js";

import { groupStoreContext } from "../context.js";
import { GroupStore } from "../group-store.js";
import { weStyles } from "../../shared-styles.js";
import { Applet } from "../../applets/types.js";
import { CustomView } from "../../custom-views/types.js";

@localized()
@customElement("group-applets")
export class GroupApplets extends LitElement {
  @consume({ context: groupStoreContext, subscribe: true })
  _groupStore!: GroupStore;

  _groupApplets = new StoreSubscriber(
    this,
    () =>
      join([
        pipe(
          this._groupStore.customViewsStore.allCustomViews,
          (allCustomViews) =>
            sliceAndJoin(
              this._groupStore.customViewsStore.customViews,
              allCustomViews
            )
        ),
        pipe(this._groupStore.allApplets, (allApplets) =>
          sliceAndJoin(this._groupStore.applets, allApplets)
        ),
      ]) as AsyncReadable<
        [
          ReadonlyMap<ActionHash, EntryRecord<CustomView>>,
          ReadonlyMap<EntryHash, Applet>
        ]
      >,
    () => [this._groupStore]
  );

  renderInstalledApplets(
    customViews: ReadonlyMap<ActionHash, EntryRecord<CustomView>>,
    applets: ReadonlyMap<EntryHash, Applet>
  ) {
    if (customViews.size === 0 && applets.size === 0)
      return html`
        <div class="column" style="flex: 1; align-items: center">
          <span
            class="placeholder"
            style="margin: 24px; max-width: 600px; text-align: center;"
            >${msg(
              "This group doesn't have any applets installed yet. Go to the applet library (the "
            )} <sl-icon .src=${wrapPathInSvg(mdiToyBrickPlus)}></sl-icon>${msg(
              " icon above) to install applets to this group."
            )}
          </span>
        </div>
      `;

    return html`
      <div class="row">
        ${Array.from(customViews.entries())
          .sort(([_, a], [__, b]) => a.entry.name.localeCompare(b.entry.name))
          .map(
            ([customViewHash, customView]) =>
              html`
                <div
                  class="column"
                  style="margin-right: 16px; align-items: center; cursor: pointer"
                  @click=${() => {
                    this.dispatchEvent(
                      new CustomEvent("custom-view-selected", {
                        detail: {
                          groupDnaHash: this._groupStore.groupDnaHash,
                          customViewHash,
                        },
                        bubbles: true,
                        composed: true,
                      })
                    );
                  }}
                >
                  <img
                    src="${customView.entry.logo}"
                    style="height: 64px; width: 64px; border-radius: 8px; margin-bottom: 8px"
                  />
                  <span>${customView.entry.name}</span>
                </div>
              `
          )}
        ${Array.from(applets.entries())
          .sort(([_, a], [__, b]) => a.custom_name.localeCompare(b.custom_name))
          .map(
            ([appletHash, applet]) =>
              html`
                <div
                  class="column"
                  style="margin-right: 16px; align-items: center; cursor: pointer"
                  @click=${() => {
                    this.dispatchEvent(
                      new CustomEvent("applet-selected", {
                        detail: {
                          groupDnaHash: this._groupStore.groupDnaHash,
                          appletHash,
                        },
                        bubbles: true,
                        composed: true,
                      })
                    );
                  }}
                >
                  <applet-logo .appletHash=${appletHash}></applet-logo>
                  <span style="margin-top: 8px">${applet.custom_name}</span>
                </div>
              `
          )}
      </div>
    `;
  }

  render() {
    switch (this._groupApplets.value?.status) {
      case "pending":
        return html`<sl-skeleton
          style="height: 48px; width: 48px;"
        ></sl-skeleton>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the applets installed in this group")}
          .error=${this._groupApplets.value.error}
        ></display-error>`;
      case "complete":
        return this.renderInstalledApplets(
          this._groupApplets.value.value[0],
          this._groupApplets.value.value[1]
        );
    }
  }

  static styles = [
    weStyles,
    css`
      :host {
        display: flex;
      }
    `,
  ];
}