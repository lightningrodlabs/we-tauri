import { css, CSSResult, html, } from "lit";
import { property } from "lit/decorators.js";
import { NHComponentShoelace } from "../ancestors/base";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import { classMap } from "lit/directives/class-map.js";

export default class NHProfileIdenticon extends NHComponentShoelace {
  @property()
  agentAvatarSrc!: string;
  @property()
  agentName!: string;
  @property()
  agentHashB64!: string;
  @property()
  loading: boolean = false;
  @property()
  background: boolean = true;
  @property()
  responsive: boolean = true;

  render() {
    return html`
    <div class="container">
      ${this.loading 
        ? html`<nh-card
        class="nested-card${classMap({
          transparent: !this.background,
          responsive: this.responsive,
        })}"
        .theme=${"dark"}
        >
          <div class="content">
            <img class="identicon" src=${this.agentAvatarSrc || "icons/profile.svg"} alt="user identicon" />
            <sl-skeleton
                  effect="pulse"
                  class="skeleton-part"
                  style="width: ${60}%; height: 2rem;" 
            ></sl-skeleton>
          </div>
        </nh-card>` 
        : html`<nh-card
                  class="nested-card${classMap({
                    transparent: !this.background,
                    responsive: this.responsive,
                  })}"
                  .theme=${"dark"}
                  .hasContextMenu=${false}
                    .hasPrimaryAction=${true}
                    .textSize=${"sm"}
                    .footerAlign=${"c"}
                >
          <div class="content">
            <img class="identicon" src=${this.agentAvatarSrc || "icons/profile.svg"} alt="user identicon" />
            <h1>${this.agentName}</h1>
          </div>
        </nh-card>`
          }
          
        </div>
    `;
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
    /* Layout */
    nh-card {
      height: 100%;
      display: block;
      max-width: 6rem;
    }

    .transparent nh-card {
      background-color: transparent;
    }

    .content {
      display: flex;
      align-items: center;
      justify-content: space-around;
      gap: calc(1px * var(--nh-spacing-lg));
    }

    .responsive .content > img {
      width: clamp(2.75rem, 2.2813rem + 1.5vw, 2.125rem);
    }

    .responsive .content > * {
      display: flex;
      font-size: clamp(0.75rem, 0.2813rem + 1.5vw, 1.125rem);
    }

    .identicon {
      height: 4rem;
      border-radius: 3rem;
    }

    .responsive .identicon {
      height: auto;
      flex-shrink: 1;
    }

    h1 {
      color:  var(--nh-theme-fg-default);
    }
    .skeleton-part {
      --color: var(--nh-theme-bg-canvas);
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
