import { css, CSSResult, html, TemplateResult } from "lit";
import { property, query, state } from "lit/decorators.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import { NHComponentShoelace } from "../ancestors/base";
import NHCard from "../card";
import NHButton from "../button";
import SlSkeleton from "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";
import { b64images } from "@neighbourhoods/design-system-styles";

export default class NHProfileCard extends NHComponentShoelace {
  @property()
  agentAvatarSrc!: string;
  @property()
  agentName: string = "No Profile";
  @property()
  agentHashB64!: string;
  @property()
  loading: boolean = false;
  @state()
  _tooltipText: string = "Copy";
  @query(".hash-container")
  _hashContainer!: HTMLElement;

  static elementDefinitions = {
    'nh-card': NHCard,
    'nh-button': NHButton,
    'sl-skeleton': SlSkeleton,
    'sl-tooltip': SlTooltip,
  }

  renderHash(hash: string) : TemplateResult {
    return html`
      <div
        class="hash-container"
        style="color: var(--nh-theme-fg-default);
        border: 1px solid var(--nh-theme-bg-detail);
        border-radius: calc(1px * var(--nh-radii-sm));
        font-family: var(--nh-font-families-body);
        font-size: calc(1px * var(--nh-font-size-sm));
        line-height: 1.2;
        overflow: hidden;
        white-space: nowrap;
        padding: calc(1px * var(--nh-spacing-xs));
        height: 1rem;
        min-width: 4rem;
        text-overflow: ellipsis;"
      >
        ${hash}
      </div>
    `;
  }

  render() : TemplateResult {
    return html`
      <nh-card
        class="squarish"
        .theme=${"light"}
        .heading=${""}
        .hasContextMenu=${false}
        .hasPrimaryAction=${false}
        .textSize=${"md"}
      >
        <div class="card-header">
          <img class="identicon"  src=${this.agentAvatarSrc || `data:image/svg+xml;base64,${b64images.nhIcons.blankProfile}`} alt="user identicon" />
          </div>
          <div class="content">
          ${this.loading 
            ? html`<nh-card
            class="nested-card"
            .theme=${"dark"}
            >
            <sl-skeleton
                  effect="pulse"
                  class="skeleton-part"
                  style="width: ${60}%; height: 1rem; margin-bottom: 8px;" 
                ></sl-skeleton>
            <hr />
            <div style="width: 100%; gap: 8px; margin-top: 8px; display: flex; flex-direction: column">
              <sl-skeleton effect="pulse" class="skeleton-part" style="height: 1rem; width: 30%" ></sl-skeleton>
              <sl-skeleton effect="pulse" class="skeleton-part" style="height: 1rem; width: 60%" ></sl-skeleton>
              <sl-skeleton effect="pulse" class="skeleton-part" style="height: 1rem; width: 40%" ></sl-skeleton>
            </div>
            </nh-card>` 
            : html`<nh-card
            class="nested-card"
            .theme=${"dark"}
            .heading=${this.agentName || "No Profile"}
            .hasContextMenu=${false}
              .hasPrimaryAction=${true}
              .textSize=${"sm"}
              .footerAlign=${"c"}
              >
              <hr />
              <h3 style="margin-top: calc(1px * var(--nh-spacing-lg));">HOLOCHAIN AGENT HASH</h3>
              <div class="hash-flex">
              ${this.renderHash(this.agentHashB64)}
              <sl-tooltip content=${this._tooltipText} placement="top" style="color: var(--nh-theme-fg-default)">
                <nh-button
                  .variant=${"primary"}
                  .size=${"icon-sm"}
                  .iconImageB64=${"PHN2ZyB3aWR0aD0iMjEiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyMSAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMSIgeT0iNSIgd2lkdGg9IjE0IiBoZWlnaHQ9IjE4IiByeD0iMyIgc3Ryb2tlPSIjNDMzQTRBIiBzdHJva2Utd2lkdGg9IjIiLz4KPHJlY3QgeD0iNiIgeT0iMSIgd2lkdGg9IjE0IiBoZWlnaHQ9IjE4IiByeD0iMyIgZmlsbD0iIzI2MUYyQiIgc3Ryb2tlPSIjNDMzQTRBIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+Cg=="}
                  @click=${() => {
                    navigator.clipboard.writeText((this._hashContainer.textContent as string)?.trim());
                    this._tooltipText = "Hash Copied!";
                    this.requestUpdate();
                }}
                >
                  </nh-button>       
                </sl-tooltip>
              </div>
            </nh-card>`
          }
          
        </div>
        <mwc-snackbar id="copied-snackbar" timeoutMs="4000" labelText="Copied!"></mwc-snackbar>
        <slot slot="footer" name="footer"></slot>
      </nh-card>
    `;
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
        border-radius: 3rem;
      }
      .hash-flex {
        display: flex;
        align-items: center;
        gap: calc(1px * var(--nh-spacing-xs));
        margin-top: calc(1px * var(--nh-spacing-sm));
      }
      .card-header {
        padding-top: 23px;
        margin-left: calc(-1px * var(--nh-spacing-xl));
        padding-left: calc(1px * var(--nh-spacing-xl));
        box-sizing: border-box;
      }

      .skeleton-part {
        --color: var(--nh-theme-bg-element);
        --sheen-color: var(--nh-theme-bg-surface);
      }
      .skeleton-part::part(indicator) {
        background-color: var(--nh-theme-bg-detail);
        border-radius: calc(1px * var(--nh-radii-base));
        opacity: 0.2;
      }
    `,
  ];
}
