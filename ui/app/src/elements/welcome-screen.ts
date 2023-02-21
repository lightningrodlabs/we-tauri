import { JoinMembraneInvitation } from "@holochain-open-dev/membrane-invitations";
import { decode } from "@msgpack/msgpack";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement, css } from "lit";
import {
  MdList,
  MdListItem,
  Card,
  Snackbar,
  MdIcon,
  MdDialog,
} from "@scoped-elements/material-web";

import { HoloIdenticon } from "@holochain-open-dev/elements";
import { matrixContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { sharedStyles } from "../../sharedStyles";
import { query } from "lit/decorators.js";
import { CreateWeGroupDialog } from "../dialogs/create-we-group-dialog";
import { SlTooltip } from "@scoped-elements/shoelace";
import { JoinGroupCard } from "../components/join-group-card";
import { ManagingGroupsCard } from "../components/managing-groups-card";

export class WelcomeScreen extends ScopedElementsMixin(LitElement) {
  @query("#we-dialog")
  _weGroupDialog!: CreateWeGroupDialog;

  @query("#join-group-dialog")
  _joinGroupDialog!: MdDialog;

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

  renderManagingGroupsCard() {
    return html`
      <mwc-card style="width: 40%; margin-right: 30px">
        <div class="column content-pane">
          <div style="font-size: 1.7em;">Managing Groups</div>
          <div
            class="default-font"
            style="text-align: left; margin-top: 40px; font-size: 1.15em;"
          >
            <ol style="line-height: 180%; margin: 0;">
              <li>
                To create a <b>new group</b>, click on the "Add Group"
                <mwc-icon style="position: relative; top: 0.25em;"
                  >group_add</mwc-icon
                >
                button in the left sidebar.
              </li>
              <li>
                You will be prompted to <b>create a profile</b> for this group.
              </li>
              <li>
                <b>Invite other members</b> to the group from the home screen of
                your new group (<md-icon
                  style="position: relative; top: 0.25em;"
                  >home</md-icon
                >). You will need to ask them for their public key (copiable
                from the identicon in the bottom left corner of the screen).
              </li>
              <li>
                <b>Install applets</b> from the DevHub that you want to use as a
                group.
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
            <create-we-group-dialog id="we-dialog"></create-we-group-dialog>
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
