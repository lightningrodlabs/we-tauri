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
      <sl-card style="width: 40%; margin-right: 30px">
        <div class="column content-pane">
          <div style="font-size: 1.7em;">${msg("Managing Groups")}</div>
          <div
            class="default-font"
            style="text-align: left; margin-top: 40px; font-size: 1.15em;"
          >
            <ol style="line-height: 180%; margin: 0;">
              <li>
                ${msg('To create a <b>new group</b>, click on the "Add Group"')}
                <sl-icon
                  style="position: relative; top: 0.25em;"
                  .src=${wrapPathInSvg(mdiAccountMultiplePlus)}
                ></sl-icon>
                ${msg("button in the left sidebar.")}
              </li>
              <li>
                ${msg(
                  "You will be prompted to <b>create a profile</b> for this group."
                )}
              </li>
              <li>
                ${msg(
                  "<b>Invite other members</b> to the group from the home screen of your new group"
                )}
                (<sl-icon
                  style="position: relative; top: 0.25em;"
                  .src=${wrapPathInSvg(mdiHome)}
                ></sl-icon
                >)
                ${msg(
                  "You will need to ask them for their public key (copiable from the identicon in the bottom left corner of the screen)."
                )}
              </li>
              <li>
                ${msg(
                  "<b>Install applets</b> from the DevHub that you want to use as a group."
                )}
              </li>
            </ol>
          </div>
        </div>
      </sl-card>
    `;
  }
  render() {
    return html`
      <div class="flex-scrollable-parent">
        <div class="flex-scrollable-container">
          <div class="flex-scrollable-y">
            <div class="column content-pane center-content">
              <div
                class="row center-content default-font"
                style="font-size: 3em; color: #2c3888; margin-top: 15px;"
              >
                <div>${msg("Welcome to We!")}</div>
              </div>

              <div class="row" style="margin-top: 70px;">
                ${this.renderManagingGroupsCard()}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static styles = [
    css`
      .content-pane {
        padding: 30px;
      }
      :host {
        display: flex;
        flex: 1;
      }
    `,
    weStyles,
  ];
}
