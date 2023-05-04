import {
  AsyncReadable,
  joinAsyncMap,
  StoreSubscriber,
} from "@holochain-open-dev/stores";
import { customElement } from "lit/decorators.js";
import { consume } from "@lit-labs/context";
import { css, html, LitElement } from "lit";
import { localized, msg } from "@lit/localize";
import { encodeHashToBase64, EntryHash } from "@holochain/client";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";

import { groupStoreContext } from "../context.js";
import { GroupStore } from "../group-store.js";
import "../../elements/sidebar-button.js";
import { weStyles } from "../../shared-styles.js";
import { Applet } from "../../applets/types.js";
import { slice } from "@holochain-open-dev/utils";
import { pipe } from "../../we-store.js";

@localized()
@customElement("registered-applets-sidebar")
export class RegisteredAppletsSidebar extends LitElement {
  @consume({ context: groupStoreContext, subscribe: true })
  _groupStore!: GroupStore;

  _registeredApplets = new StoreSubscriber(
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
    return html`
      ${Array.from(applets.entries())
        .sort(([_, a], [__, b]) => a.custom_name.localeCompare(b.custom_name))
        .map(
          ([appletHash, applet]) =>
            html`
              <sidebar-button
                style="margin-top: 2px; margin-bottom: 2px; border-radius: 50%;"
                .logoSrc=${`applet://${encodeHashToBase64(
                  appletHash
                )}/icon.png`}
                .tooltipText=${applet.custom_name}
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
              ></sidebar-button>
            `
        )}
    `;
  }

  render() {
    switch (this._registeredApplets.value?.status) {
      case "pending":
        return html`<sl-skeleton
          style="height: 48px; width: 48px;"
        ></sl-skeleton>`;
      case "error":
        return html`<display-error
          tooltip
          .headline=${msg("Error fetching the applets installed in this group")}
          .error=${this._registeredApplets.value.error.data.data}
        ></display-error>`;
      case "complete":
        return this.renderInstalledApplets(this._registeredApplets.value.value);
    }
  }

  static styles = [
    weStyles,
    css`
      :host {
        background-color: rgba(48, 63, 159, 0.21);
      }
    `,
  ];
}