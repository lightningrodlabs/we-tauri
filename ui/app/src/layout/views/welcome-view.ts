import { html, LitElement, css } from "lit";
import { customElement } from "lit/decorators.js";
import { localized, msg } from "@lit/localize";

import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";

import { weStyles } from "../../shared-styles.js";
import { wrapPathInSvg } from "@holochain-open-dev/elements";
import { mdiAccountMultiplePlus, mdiHome } from "@mdi/js";

@localized()
@customElement("welcome-view")
export class WelcomeView extends LitElement {
  renderManagingGroupsCard() {
    return html`
      <sl-card>
        <span slot="header">${msg("Managing Groups")}</span>
        <div class="default-font" style="text-align: left; font-size: 1.15em;">
          <ol style="line-height: 180%; margin: 0;">
            <li>
              ${msg('To create a new group, click on the "Add Group"')}
              <sl-icon
                style="position: relative; top: 0.25em;"
                .src=${wrapPathInSvg(mdiAccountMultiplePlus)}
              ></sl-icon>
              ${msg("button in the left sidebar.")}
            </li>
            <li>
              ${msg(
                "In we, you have a profile for each group you are in. When you create a group, you will be prompted to create a profile for this group."
              )}
            </li>
            <li>
              ${msg(
                "Invite other members to the group by sharing the group link with them"
              )}
            </li>
            <li>${msg("Install applets that you want to use as a group.")}</li>
          </ol>
        </div>
      </sl-card>
    `;
  }

  render() {
    return html`
      <div class="column">
        <div
          class="row center-content default-font"
          style="font-size: 3em; color: #2c3888; margin-top: 15px;"
        >
          <div>${msg("Welcome to We!")}</div>
        </div>

        <div class="row" style="margin-top: 48px;">
          ${this.renderManagingGroupsCard()}
        </div>
      </div>
    `;
  }

  static styles = [
    css`
      :host {
        display: flex;
        flex: 1;
      }
    `,
    weStyles,
  ];
}