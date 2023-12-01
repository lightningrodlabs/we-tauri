import { JoinMembraneInvitation } from "@holochain-open-dev/membrane-invitations";
import { contextProvided } from "@lit-labs/context";
import { decode } from "@msgpack/msgpack";
import { html, css, CSSResult } from "lit";
import {
  Snackbar,
  Dialog,
} from "@scoped-elements/material-web";

import { matrixContext } from "../../context";
import { MatrixStore } from "../../matrix-store";

import { query } from "lit/decorators.js";
import { NHComponentShoelace } from '@neighbourhoods/design-system-components';
import { CreateNeighbourhoodDialog } from "../dialogs/create-nh-dialog";
import { JoinGroupCard } from "../components/join-group-card";
import { ManagingGroupsCard } from "../components/managing-groups-card";


export class HomeScreen extends NHComponentShoelace {
  @contextProvided({ context: matrixContext, subscribe: true })
  matrixStore!: MatrixStore;

  @query("#we-dialog")
  _weGroupDialog!: CreateNeighbourhoodDialog;

  @query("#join-group-dialog")
  _joinGroupDialog!: Dialog;

  @query("#copied-snackbar")
  _copiedSnackbar!: Snackbar;

  weName(invitation: JoinMembraneInvitation) {
    return (decode(invitation.clone_dna_recipe.properties) as any).name;
  }

  weImg(invitation: JoinMembraneInvitation) {
    return (decode(invitation.clone_dna_recipe.properties) as any).logoSrc;
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
                <managing-groups-card></managing-groups-card>
                <join-group-card ></join-group-card>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static get elementDefinitions() {
    return {
      "mwc-snackbar": Snackbar,
      "create-we-group-dialog": CreateNeighbourhoodDialog,
      "join-group-card": JoinGroupCard,
      "managing-groups-card": ManagingGroupsCard,
    };
  }

  static styles : CSSResult[] = [
    super.styles as CSSResult,
      css`
      .content-pane {
        display: flex;
        gap:  calc(1px * var(--nh-spacing-3xl));
        margin:  calc(1px * var(--nh-spacing-3xl));
        flex-direction: row;
        align-items: flex-start;
      }

      @media (max-width: 1024px) {
        .content-pane {
          flex-wrap: wrap;
        }
        .content-pane > * {
          justify-content: center;
          flex: 1;
        }
      }
    `
  ];
}
