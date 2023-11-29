import { contextProvided } from "@lit-labs/context";
import { html, css, CSSResult } from "lit";

import { matrixContext, weGroupContext } from "../../context";
import { MatrixStore } from "../../matrix-store";

import {  state } from "lit/decorators.js";
import { NHButton, NHCard, NHComponentShoelace, NHDialog, NHPageHeaderCard } from '@neighbourhoods/design-system-components';
import { SlSkeleton, SlTooltip } from "@scoped-elements/shoelace";
import { InvitationsBlock } from "../components/invitations-block";
import { AppletLibrary } from "../components/applet-library";
import { StoreSubscriber } from "lit-svelte-stores";
import { DnaHash, EntryHash } from "@holochain/client";
import { NeighbourhoodSettings } from "./neighbourhood-settings";
import { SensemakerStore, sensemakerStoreContext } from "@neighbourhoods/client";
import { ProfilePrompt } from "../components/profile-prompt";
import { AppletNotInstalled } from "./applet-not-installed";
import { provideWeGroupInfo } from "../../matrix-helpers";

export class NeighbourhoodHome extends NHComponentShoelace {
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  _profilesStore = new StoreSubscriber(
    this,
    () => this._matrixStore.profilesStore(this.weGroupId),
    () => [this._matrixStore, this.weGroupId]
  );

  @contextProvided({ context: sensemakerStoreContext, subscribe: true })
  _sensemakerStore!: SensemakerStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  _neighbourhoodInfo = new StoreSubscriber(
    this,
    () => provideWeGroupInfo(this._matrixStore, this.weGroupId),
    () => [this._matrixStore, this.weGroupId]
  );

  @state()
  private _showLibrary: boolean = false;

  @state()
  private _showInstallScreen: boolean = false;

  @state()
  private _installAppletId: EntryHash | undefined;

  @state()
  private _installMode: "reinstall" | "join" = "join";

  public showLibrary() {
    this._showLibrary = true
  }

  renderContent() {
    if (this._showInstallScreen) {
      return html`
          ${this._installMode == "reinstall"
            ? html`
              <applet-not-installed
                .appletInstanceId=${this._installAppletId}
                .mode=${"reinstall"}
                @cancel-reinstall=${() => { this._showInstallScreen = false; this._installAppletId = undefined; }}>
              </applet-not-installed>
              `
            : html`
              <applet-not-installed
                .appletInstanceId=${this._installAppletId}
                .mode=${"join"}
                @cancel-reinstall=${() => { this._showInstallScreen = false; this._installAppletId = undefined; }}>
              </applet-not-installed>
            `
          } `
    }

    return this._showLibrary
      ? html`
            <div class="container">
              <applet-library .toggleVisible=${() => { this._showLibrary = false }}></applet-library>
            </div>
        `
      : html`
            <div class="container">
              <div class="nh-image">
                ${this._neighbourhoodInfo.value
                  ? html`<img
                      class="logo-large"
                      src=${this._neighbourhoodInfo.value?.logoSrc}
                    />`
                  : html``}
                <h1>
                  ${this._neighbourhoodInfo.value?.name !== undefined ? this._neighbourhoodInfo.value?.name : ''}
                </h1>
              </div>

              <div class="card-block">
                <invitations-block></invitations-block>

                <nh-card .theme=${"dark"} .title=${""} .heading=${"Add new applet"} .textSize=${"sm"} .hasPrimaryAction=${true}>
                  <p>
                    Initiate a new Applet instance from scratch that other neighbourhood members will be able to join.
                  </p>
                  <div slot="footer">
                    <nh-button .variant=${"primary"} @click=${() => this._showLibrary = true} .size=${"auto"}>Browse Applets</nh-button>
                  </div>
                </nh-card>
              </div>
              <neighbourhood-settings class="settings"
                @join-applet=${(e: CustomEvent) => {
                  this._installAppletId = e.detail;
                  this._installMode = "join";
                  this._showInstallScreen = true;
                  }
                }
                @reinstall-applet=${(e: CustomEvent) => {
                  this._installAppletId = e.detail;
                  this._installMode = "reinstall";
                  this._showInstallScreen = true;
                  }
                }
              >
                <div class="to-join"></div>
                <div class="installed"></div>
                <div class="uninstalled"></div>
                <div class="danger-zone"></div>
              </neighbourhood-settings>
            </div>
    `
  }

  refresh() {
    this.requestUpdate()
  }

  render() {
    const info = this._neighbourhoodInfo
    if (!info.value) {
      return html`<sl-skeleton effect="sheen" class="skeleton-part" style="width: 80%; height: 2rem; opacity: 0" ></sl-skeleton>` // TODO: fix this loading transition - it is currently quite jarring
    } else {
      return info.value?.myProfile?.nickname
        ? this.renderContent()
        : html`<main @profile-created=${this.refresh}><profile-prompt .profilesStore=${this._profilesStore.value} .neighbourhoodInfo=${info}></profile-prompt></main>`
    }
  }

  static elementDefinitions = {
      'nh-page-header-card': NHPageHeaderCard,
      "nh-button": NHButton,
      "nh-card": NHCard,
      'nh-dialog': NHDialog,
      "applet-library": AppletLibrary,
      "profile-prompt": ProfilePrompt,
      "invitations-block": InvitationsBlock,
      "neighbourhood-settings": NeighbourhoodSettings,
      "sl-tooltip": SlTooltip,
      "sl-skeleton": SlSkeleton,
      'applet-not-installed': AppletNotInstalled,
  }

  static styles : CSSResult[] = [
    super.styles as CSSResult,
      css`
        /** Layout **/

        main {
          display: flex;
          flex: 1;
        }

        .container {
          flex: 1;
          display: grid;
          gap: calc(1px * var(--nh-spacing-sm));
          padding: calc(1px * var(--nh-spacing-3xl));
          grid-template-columns: 1fr 1fr;
          grid-template-rows: auto;
          grid-template-areas:  "nh-image card-block"
                                "nh-settings nh-settings";
        }
        .nh-image { grid-area: nh-image; align-self: center; }
        .card-block { grid-area: card-block; align-self: center; }
        .settings { grid-area: nh-settings; display: flex; flex-direction: column;}
        applet-library { grid-column: -1/1; grid-row: -1/1; }

        /** Sub-Layout **/
        .to-join, .installed, .uninstalled, .danger-zone {
          display: flex;
          flex: 1;
        }

        .nh-image {
          display: grid;
          place-content: center
        }

        .card-block {
          display: flex;
          flex-direction: column;
          gap: calc(1px * var(--nh-spacing-3xl));
        }

        .logo-large {
          width: 200px;
          height: 200px;
          border-radius: 100%;
        }

        /** Typo **/
        h1 {
          text-align: center;
        }
    `
  ];
}
