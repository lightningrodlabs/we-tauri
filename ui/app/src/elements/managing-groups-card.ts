import { HeaderHashB64, AgentPubKeyB64, serializeHash } from "@holochain-open-dev/core-types";
import { JoinMembraneInvitation } from "@holochain-open-dev/membrane-invitations";
import { contextProvided } from "@lit-labs/context";
import { decode } from "@msgpack/msgpack";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement, css } from "lit";
import { TaskSubscriber } from "lit-svelte-stores";
import { Button, List, ListItem, Card, Snackbar, Icon, Dialog } from "@scoped-elements/material-web";

import { matrixContext } from "../context";
import { MatrixStore } from "../matrix-store";
import { sharedStyles } from "../sharedStyles";
import { query } from "lit/decorators.js";
import { HoloIdenticon } from "@holochain-open-dev/utils";
import { CreateWeDialog } from "./create-we-dialog";
import { SlTooltip } from "@scoped-elements/shoelace";


export class ManagingGroupsCard extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: matrixContext })
  matrixStore!: MatrixStore;


  render() {
    return html`

      <mwc-card>

        <div class="column content-pane default-font">
          <div style="font-size: 1.7em;">
            Managing Groups
          </div>
          <div class="default-font" style="text-align: left; margin-top: 40px; font-size: 1.15em;">
            <ol style="line-height: 180%; margin: 0;">
              <li>To create a <b>new group</b>, click on the "Add Group" <mwc-icon style="position: relative; top: 0.25em;">group_add</mwc-icon> button in the left sidebar.</li>
              <li>You will be prompted to <b>create a profile</b> for this group.</li>
              <li><b>Invite other members</b> to the group from the home screen of your new group (<mwc-icon style="position: relative; top: 0.25em;">home</mwc-icon>). You will need to ask them for their public key (copiable from the identicon in the bottom left corner of the screen).</li>
              <li><b>Install hApps</b> from the DevHub that you want to use as a group.</li>
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
      "create-we-dialog": CreateWeDialog,
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

      .title {
        align-items: center;
        font-family: Roboto, 'Open Sans', 'Helvetica Neue', sans-serif;
        font-size: 1.2em;
        text-align: center;
      }

      .accept-invitation {
        --mdc-theme-primary: #17c200;
      }

      .delete-invitation {
        --mdc-theme-primary: #cf0000;
        margin-left: 5px;
      }

      .we-image {
        height: 30px;
        width: 30px;
        border-radius: 50%;
      }

      .pubkey-field {
        color: black;
        background: #f4f0fa;
        border-radius: 4px;
        overflow-x: scroll;
        padding: 10px;
        white-space: nowrap;
        cursor: pointer;
      }

    `

    return [sharedStyles, localStyles];
  }
}
