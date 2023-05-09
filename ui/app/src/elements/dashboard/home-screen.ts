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

import { matrixContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { sharedStyles } from "../../sharedStyles";
import { query } from "lit/decorators.js";
import { HoloIdenticon } from "@holochain-open-dev/elements";
import { CreateWeGroupDialog } from "../dialogs/create-we-group-dialog";
import { SlTooltip } from "@scoped-elements/shoelace";
import { JoinGroupCard } from "../components/join-group-card";
import { ManagingGroupsCard } from "../components/managing-groups-card";

export class HomeScreen extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: matrixContext, subscribe: true })
  matrixStore!: MatrixStore;


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
        labelText="You are already part of this Group!"
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
                <div>Welcome to Neighbourhoods Launcher!</div>
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


    `;

    return [sharedStyles, localStyles];
  }
}
