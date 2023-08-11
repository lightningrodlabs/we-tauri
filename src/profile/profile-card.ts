import { css, CSSResult, html } from "lit";
import { property } from "lit/decorators.js";
import "../card";
import { NHCard } from "../card";
import { NHButton } from "../button";
import { NHComponentShoelace } from "../ancestors/base";

export class NHProfileCard extends NHComponentShoelace {
  @property()
  agentName!: string;
  @property()
  agentHashB64!: string;

  renderHash(hash: string) {
    return html`
      <div
        class="hash-container"
        style="color: var(--nh-theme-fg-default);
        border: 1px solid var(--nh-menu-subtitle);
        border-radius: calc(1px * var(--nh-radii-sm));
        font-family: var(--nh-font-families-body);
        font-size: calc(1px * var(--nh-font-size-sm));
        line-height: 1.2;
        overflow: hidden;
        white-space: nowrap;
        padding: calc(1px * var(--nh-spacing-xs));
        margin-top: calc(1px * var(--nh-spacing-sm));
        margin-right: calc(1px * var(--nh-spacing-3xl));
        height: 1rem;
        min-width: 4rem;
        text-overflow: ellipsis;"
      >
        ${hash}
      </div>
    `;
  }

  render() {
    return html`
      <nh-card
        .theme=${"light"}
        .heading=${""}
        .hasContextMenu=${false}
        .hasPrimaryAction=${false}
        .textSize=${"md"}
      >
        <div class="card-header">
          <img class="identicon" src="icons/profile.svg" alt="user identicon" />
          </div>
          <div class="content">
          <nh-card
          class="nested-card"
          .theme=${"dark"}
          .heading=${this.agentName}
          .hasContextMenu=${false}
            .hasPrimaryAction=${true}
            .textSize=${"sm"}
            .footerAlign=${"c"}
            >
            <hr />
            <h3 style="margin-top: calc(1px * var(--nh-spacing-lg));">HOLOCHAIN AGENT HASH</h3>
            <div style="display: flex">
            ${this.renderHash(this.agentHashB64)}
              <nh-button
                .variant=${"primary"}
                .size=${"icon"}
                .iconImageB64=${"PHN2ZyB3aWR0aD0iMjEiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyMSAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMSIgeT0iNSIgd2lkdGg9IjE0IiBoZWlnaHQ9IjE4IiByeD0iMyIgc3Ryb2tlPSIjNDMzQTRBIiBzdHJva2Utd2lkdGg9IjIiLz4KPHJlY3QgeD0iNiIgeT0iMSIgd2lkdGg9IjE0IiBoZWlnaHQ9IjE4IiByeD0iMyIgZmlsbD0iIzI2MUYyQiIgc3Ryb2tlPSIjNDMzQTRBIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+Cg=="}
              >
                <img class="copy-hash" src="icons/copy.svg" alt="user identicon" />
              </nh-button>       
            </div>
          </nh-card>
        </div>
        <slot slot="footer" name="footer"></slot>
      </nh-card>
    `;
  }

  static get elementDefinitions() {
    return {
      "nh-card": NHCard,
      "nh-button": NHButton,
    };
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      :host {
        --top-color: #D9D9D9;
      }
      /* Layout */
      nh-card {
        height: 100%;
        display: block;
      }

      :root {
        display: flex;
        position: relative;
      }

      .card-header {
        border-top-right-radius: calc(1px * var(--nh-radii-lg));
        border-top-left-radius: calc(1px * var(--nh-radii-lg));
        background: var(--top-color);
        position: absolute;
        top: 0;
        width: 100%;
        height: 25%;
      }
      .content {
        padding-top: 6rem;
      }
      .identicon {
        height: 180%;
      }
      .card-header {
        padding-top: 23px;
        margin-left: calc(-1px * var(--nh-spacing-xl));
        padding-left: calc(1px * var(--nh-spacing-xl));
        box-sizing: border-box;
      }
    `,
  ];
}
