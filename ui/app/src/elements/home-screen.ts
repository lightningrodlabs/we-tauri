import { JoinMembraneInvitation } from "@holochain-open-dev/membrane-invitations";
import { contextProvided } from "@lit-labs/context";
import { decode } from "@msgpack/msgpack";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement, css } from "lit";
import { TaskSubscriber } from "lit-svelte-stores";
import {
  Button,
  List,
  ListItem,
  Card,
  Snackbar,
  Icon,
  Dialog,
} from "@scoped-elements/material-web";

import { matrixContext } from "../context";
import { MatrixStore } from "../matrix-store";
import { sharedStyles } from "../sharedStyles";
import { query } from "lit/decorators.js";
import { HoloIdenticon } from "@holochain-open-dev/utils";
import { CreateWeGroupDialog } from "./create-we-group-dialog";
import { SlTooltip } from "@scoped-elements/shoelace";
import { JoinGroupCard } from "./join-group-card";
import { ManagingGroupsCard } from "./managing-groups-card";

export class HomeScreen extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: matrixContext })
  matrixStore!: MatrixStore;

  _myInvitations = new TaskSubscriber(this, () =>
    this.matrixStore.membraneInvitationsStore.fetchMyInvitations()
  );

  @query("#we-dialog")
  _weGroupDialog!: CreateWeGroupDialog;

  @query("#join-group-dialog")
  _joinGroupDialog!: Dialog;

  @query("#copied-snackbar")
  _copiedSnackbar!: Snackbar;


  weName(invitation: JoinMembraneInvitation) {
    return (decode(invitation.cloneDnaRecipe.properties) as any).name;
  }

  weImg(invitation: JoinMembraneInvitation) {
    return (decode(invitation.cloneDnaRecipe.properties) as any).logoSrc;
  }



  renderErrorSnackbar() {
    return html`
      <mwc-snackbar
        style="text-align: center;"
        id="error-snackbar"
        labelText="You are already part of this We!"
      >
      </mwc-snackbar>
    `;
  }


  render() {
    return html`
      <div class="flex-scrollable-parent">
        <div class="flex-scrollable-container">
          <div class="flex-scrollable-y">
            <create-we-group-dialog
              id="we-dialog"
            ></create-we-group-dialog>
            <mwc-snackbar
              id="copied-snackbar"
              timeoutMs="4000"
              labelText="Copied!"
              style="text-align: center;"
            ></mwc-snackbar>

            <div class="column content-pane center-content">
              <div
                class="row center-content default-font"
                style="font-size: 3em; color: #2c3888; margin-top: 15px;"
              >
                <div>Welcome to We!</div>
              </div>

              <div class="row" style="margin-top: 70px;">
                <managing-groups-card
                  style="width: 40%; margin-right: 30px;"
                ></managing-groups-card>
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
      "join-group-card": JoinGroupCard,
      "managing-groups-card": ManagingGroupsCard,
    };
  }

  static get styles() {
    let localStyles = css`
      .content-pane {
        padding: 30px;
      }

      .default-font {
        font-family: Roboto, "Open Sans", "Helvetica Neue", sans-serif;
      }

      .title {
        align-items: center;
        font-family: Roboto, "Open Sans", "Helvetica Neue", sans-serif;
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
    `;

    return [sharedStyles, localStyles];
  }
}
