import { JoinMembraneInvitation } from "@holochain-open-dev/membrane-invitations";
import { contextProvided } from "@lit-labs/context";
import { decode } from "@msgpack/msgpack";
import { html, css, CSSResult } from "lit";

import { matrixContext } from "../../context";
import { MatrixStore } from "../../matrix-store";

import { query, state } from "lit/decorators.js";
import { NHButton, NHCard, NHComponentShoelace, NHDialog, NHPageHeaderCard } from '@neighbourhoods/design-system-components';
import { CreateNeighbourhoodDialog } from "../dialogs/create-nh-dialog";
import { JoinGroupCard } from "../components/join-group-card";
import { ManagingGroupsCard } from "../components/managing-groups-card";
import { SlTooltip } from "@scoped-elements/shoelace";
import { InstallableApplets } from "../components/installable-applets";
import { InvitationsBlock } from "../components/invitations-block";


export class HomeScreen extends NHComponentShoelace {
  @contextProvided({ context: matrixContext, subscribe: true })
  matrixStore!: MatrixStore;

  @state()
  private _showLibrary: boolean = false;


  render() {
    return html`
      <div class="container">
        <div class="nh-image"></div>
        <div class="card-block">
          <invitations-block></invitations-block>

          <nh-card .theme=${"dark"} .title=${""} .heading=${"Add new applet"} .textSize=${"sm"} .hasPrimaryAction=${true}>
            <p>
              Initiate a new Applet instance from scratch that other neighbourhood members will be able to join.
            </p>
            <div slot="footer">
              <nh-button label="Browse Applets" .variant=${"primary"} .clickHandler=${() => this._showLibrary = true} .size=${"stretch"}></nh-button>
            </div>
          </nh-card>  
        </div>
        <div class="to-join"></div>
        <div class="installed"></div>
        <div class="uninstalled"></div>
        <div class="danger-zone"></div>
      </div>
    `
  }


  static elementDefinitions = {
      'nh-page-header-card': NHPageHeaderCard,
      "nh-button": NHButton,
      "nh-card": NHCard,
      'nh-dialog': NHDialog,
      "installable-applets": InstallableApplets,
      "invitations-block": InvitationsBlock,
      "sl-tooltip": SlTooltip,
      // "nh-create-profile": NHCreateProfile,
      // "mwc-button": Button,
      // "mwc-fab": Fab,
      // "mwc-card": Card,
      // "mwc-icon-button": IconButton,
      // "mwc-circular-progress": CircularProgress,
      // "mwc-icon-button-toggle": IconButtonToggle,
      // "mwc-linear-progress": LinearProgress,
      // // "list-agents-by-status": ListAgentsByStatus,
      // 'nh-button': NHButton,
      // "mwc-snackbar": Snackbar,
      // "install-from-fs-dialog": InstallFromFsDialog,
      // "we-group-settings": WeGroupSettings,
      // "applet-not-installed": AppletNotInstalled,
      // "nh-sensemaker-settings": NHSensemakerSettings,
  }

  static styles : CSSResult[] = [
    super.styles as CSSResult,
      css`
        /** Layout **/
        
        :host {
          display: flex;
        }

        .container {
          flex: 1;
          display: grid;
          gap: calc(1px * var(--nh-spacing-sm));
          padding: calc(1px * var(--nh-spacing-lg));
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 30% 1fr 1fr 1fr 1fr;
          grid-template-areas:  "nh-image card-block"
                                "to-join to-join"
                                "installed installed"
                                "uninstalled uninstalled"
                                "danger-zone danger-zone";
        }
        .nh-image { grid-area: nh-image; }
        .card-block { grid-area: card-block; }
        .to-join { grid-area: to-join; }
        .installed { grid-area: installed; }
        .uninstalled { grid-area: uninstalled; }
        .danger-zone { grid-area: danger-zone; }

        /** Sub-Layout **/

        .card-block {
          display: flex;
          flex-direction: column;
          gap: calc(1px * var(--nh-spacing-sm));
        }
    `
  ];
}

// .container > * {
//   background-color: var(--nh-theme-bg-surface); 
// }