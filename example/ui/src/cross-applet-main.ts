import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { localized, msg } from "@lit/localize";

import { sharedStyles } from "@holochain-open-dev/elements";
import { lazyLoad, StoreSubscriber } from "@holochain-open-dev/stores";
import {
  getAppletsInfosAndGroupsProfiles,
  WeServices,
  weServicesContext,
  AppletClients,
} from "@lightningrodlabs/we-applet";
import { consume } from "@lit-labs/context";
import { EntryHash } from "@holochain/client";

@localized()
@customElement("cross-applet-main")
export class CrossAppletMain extends LitElement {
  @property()
  applets!: ReadonlyMap<EntryHash, AppletClients>;

  @consume({ context: weServicesContext, subscribe: true })
  weServices!: WeServices;

  appletsInfo = new StoreSubscriber(
    this,
    () =>
      lazyLoad(async () =>
        getAppletsInfosAndGroupsProfiles(
          this.weServices,
          Array.from(this.applets.keys())
        )
      ),
    () => []
  );

  render() {
    return html``;
  }

  static styles = [
    css`
      :host {
        display: flex;
        flex: 1;
      }
    `,
    sharedStyles,
  ];
}