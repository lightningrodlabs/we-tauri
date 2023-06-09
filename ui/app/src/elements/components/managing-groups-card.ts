import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement, css } from "lit";
import { Button, List, ListItem, Card, Snackbar, Icon, Dialog } from "@scoped-elements/material-web";

import { matrixContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { sharedStyles } from "../../sharedStyles";
import { HoloIdenticon } from "@holochain-open-dev/elements";
import { CreateWeGroupDialog } from "../dialogs/create-we-group-dialog";
import { SlTooltip } from "@scoped-elements/shoelace";


export class ManagingGroupsCard extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: matrixContext, subscribe: true })
  matrixStore!: MatrixStore;


  render() {
    return html`

      <mwc-card>

        <div class="column content-pane default-font">
          <div style="font-size: 1.7em;">
            Managing Neighbourhoods
          </div>
          <div class="default-font" style="text-align: left; margin-top: 40px; font-size: 1.15em;">
            <ol style="line-height: 180%; margin: 0;">
              <li>To create a <b>new neighbourhood</b>, click on the "Add Neighbourhood" <mwc-icon style="position: relative; top: 0.25em;">group_add</mwc-icon> button in the left sidebar.</li>
              <li>You will be prompted to <b>create a profile</b> for this neighbourhood.</li>
              <li><b>Invite other members</b> to the neighbourhood from the home screen of your new neighbourhood (<mwc-icon style="position: relative; top: 0.25em;">home</mwc-icon>). You will need to ask them for their public key (copiable from the identicon in the bottom left corner of the screen).</li>
              <li><b>Install applets</b> from the DevHub that you want to use as a neighbourhood.</li>
            </ol>
          </div>
        </div>

      </mwc-card>
    `;
  }


  static get scopedElements() {
    return {
      "mwc-button": Button,
      "mwc-list": List,
      "mwc-list-item": ListItem,
      "mwc-card": Card,
      "mwc-icon": Icon,
      "mwc-snackbar": Snackbar,
      "holo-identicon": HoloIdenticon,
      "create-we-group-dialog": CreateWeGroupDialog,
      "sl-tooltip": SlTooltip,
      "mwc-dialog": Dialog,
    };
  }

  static get styles() {
    let localStyles = css`

      li {
        margin-bottom: 20px;
      }

      .content-pane {
        padding: 30px;
      }

      .default-font {
        font-family: Roboto, 'Open Sans', 'Helvetica Neue', sans-serif;
      }


    `

    return [sharedStyles, localStyles];
  }
}