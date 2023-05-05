import {
  AsyncReadable,
  joinAsyncMap,
  pipe,
  StoreSubscriber,
} from "@holochain-open-dev/stores";
import { customElement } from "lit/decorators.js";
import { consume } from "@lit-labs/context";
import { css, html, LitElement } from "lit";
import { localized, msg } from "@lit/localize";
import { EntryHash } from "@holochain/client";
import { slice } from "@holochain-open-dev/utils";
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

@localized()
@customElement("group-applets")
export class GroupApplets extends LitElement {
  @consume({ context: groupStoreContext, subscribe: true })
  _groupStore!: GroupStore;

  _groupApplets = new StoreSubscriber(
    this,
    () =>
      pipe(
        this._groupStore.allApplets,
        (allApplets) =>
          joinAsyncMap(
            slice(this._groupStore.applets, allApplets)
          ) as AsyncReadable<ReadonlyMap<EntryHash, Applet>>
      ),
    () => [this._groupStore]
  );

  renderInstalledApplets(applets: ReadonlyMap<EntryHash, Applet>) {
    if (applets.size === 0)
      return html`
        <div class="row center-content" style="flex: 1">
          <span class="placeholder" style="margin: 24px"
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
                  <span>${applet.custom_name}</span>
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
        return this.renderInstalledApplets(this._groupApplets.value.value);
    }
  }

  static styles = [
    weStyles,
    css`
      :host {
      }
    `,
  ];
}
