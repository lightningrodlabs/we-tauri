import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement, css } from "lit";
import {
  Card,
  Snackbar,
  MdIcon,
  MdDialog,
} from "@scoped-elements/material-web";
import { SlTooltip } from "@scoped-elements/shoelace";
import { localized, msg } from "@lit/localize";
import { HoloIdenticon, sharedStyles } from "@holochain-open-dev/elements";

import { weStyles } from "../shared-styles.js";
import { JoinGroupCard } from "./join-group-card.js";

@localized()
export class WelcomeScreen extends ScopedElementsMixin(LitElement) {
  renderManagingGroupsCard() {
    return html`
      <mwc-card style="width: 40%; margin-right: 30px">
        <div class="column content-pane">
          <div style="font-size: 1.7em;">${msg("Managing Groups")}</div>
          <div
            class="default-font"
            style="text-align: left; margin-top: 40px; font-size: 1.15em;"
          >
            <ol style="line-height: 180%; margin: 0;">
              <li>
                ${msg('To create a <b>new group</b>, click on the "Add Group"')}
                <md-icon style="position: relative; top: 0.25em;"
                  >group_add</md-icon
                >
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
                (<md-icon style="position: relative; top: 0.25em;">home</md-icon
                >).
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
      </mwc-card>
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
                <join-group-card style="width: 60%;"></join-group-card>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static get scopedElements() {
    return {
      "mwc-card": Card,
      "md-icon": MdIcon,
      "mwc-snackbar": Snackbar,
      "holo-identicon": HoloIdenticon,
      "sl-tooltip": SlTooltip,
      "md-dialog": MdDialog,
      "join-group-card": JoinGroupCard,
    };
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
    sharedStyles,
    weStyles,
  ];
}
