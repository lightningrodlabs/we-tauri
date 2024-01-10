import { css, CSSResult, html, TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { NHComponentShoelace } from "./ancestors/base";
import { classMap } from "lit/directives/class-map.js";
import { SlMenu, SlMenuItem, SlMenuLabel } from "@shoelace-style/shoelace";

export type MenuSection = {
  sectionName: string;
  sectionMembers: MenuSectionMember[];
};

export type MenuSectionMember = {
  label: string;
  callback: () => void;
  subSectionMembers: string[]
};

export default class NHMenu extends NHComponentShoelace {
  @property()
  theme: string = "dark";

  @state()
  selectedMenuItemId!: string; // sectionName concatenated with sectionMember index, subSectionMember index e.g. Sensemaker-0-0
  @property()
  menuSectionDetails: MenuSection[] = [
    {
      sectionName: "Sensemaker",
      sectionMembers: [
        {
          label: "0",
          subSectionMembers: ["0-0", "0-1"],
          callback: () => {
            console.log("hi!");
          },
        },
      ],
    },
  ];

  renderTopLevel() : TemplateResult {
    return html`
      ${this.menuSectionDetails.map(({ sectionName, sectionMembers }) => {
        return html`
          <sl-menu class="menu-section">
            <sl-menu-label class="menu-section-label">
              ${sectionName}
            </sl-menu-label>
            ${sectionMembers.map(({ label, callback, subSectionMembers }, idx) => {
              return html`<sl-menu-item
              class="menu-item ${classMap({
                active: !!(this.selectedMenuItemId && this.selectedMenuItemId.match(sectionName + '-' + idx)),
              })}"
              value="${label}"
              @click=${() => {
                this.selectedMenuItemId = sectionName + '-' + idx + '-';
                callback();
              }}
              >${label}
              </sl-menu-item>
              <div class="sub-nav indented">
              ${subSectionMembers.map((label, idx2) => {
                return html`<sl-menu-item
                    class="menu-item ${classMap({
                      active: !!(this.selectedMenuItemId && this.selectedMenuItemId.match(sectionName + '-' + idx + '-' + idx2)),
                    })}"
                    value=${label}
                    @click=${() => {
                      this.selectedMenuItemId = sectionName + '-' + idx + '-' + idx2;
                      this.dispatchEvent(
                        new CustomEvent("sub-nav-item-selected", {
                          detail: { item: label, itemId: this.selectedMenuItemId},
                          bubbles: true,
                          composed: true,
                        })
                      )
                    }}
                    >${label}
                  </sl-menu-item>
                `
              })}
              </div>
            `;
            })}
          </sl-menu>
        `;
      })}
    `;
  }

  static elementDefinitions = {
    "sl-menu": SlMenu,
    "sl-menu-item": SlMenuItem,
    "sl-menu-label": SlMenuLabel,
  };

  render() : TemplateResult {
    return html`
      <nav
        class="container${classMap({
          dark: this.theme == "dark",
        })}"
      >
        ${this.renderTopLevel()}
      </nav>
    `;
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      /* Layout */
      :host {
        --menu-width: 138px;
        --nh-theme-menu-sub-title: #A89CB0; /* TODO: check with design team if this is up to date */
      }
      nav.container {
        flex-basis: var(--menu-width);
        padding: 0 calc(1px * var(--nh-spacing-sm));
        background: var(--nh-theme-bg-canvas);
      }
      .menu-item::part(base), .menu-item::part(label), .menu-section-label::part(base) {
        height: calc(1.125px * var(--nh-spacing-3xl));
        display: flex;
        justify-content: flex-start;
        align-items: center;
      }
      
      .menu-section-label::part(base),
      .menu-item::part(base) {
        padding: 0 calc(1px * var(--nh-spacing-sm));
      }

      /* Typo */
      .menu-section-label::part(base) {
        color: var(--nh-theme-menu-sub-title);
        text-transform: uppercase;
        font-size: calc(1px * var(--nh-font-size-md));
        font-weight: var(--nh-font-weights-body-bold);
        // font-family: var(--nh-font-families-headlines);
        font-family: "Work Sans", "Open Sans";
        letter-spacing: var(--nh-letter-spacing-buttons);
      }
      .menu-item::part(base) {
        color: var(--nh-theme-fg-default);
        font-size: calc(1px * var(--nh-font-size-md));
      }

      /* Alignment, borders etc */
      .menu-item {
        border-radius: calc(1px * var(--nh-radii-base) - 0px);
        overflow: hidden;
        margin-bottom: calc(1px * var(--nh-spacing-xs));
      }
      .menu-item::part(base) {
        padding: calc(1px * var(--nh-spacing-xxs));
        padding-left: calc(1px * var(--nh-spacing-sm));
      }
      .indented {
        padding-left: calc(1px * var(--nh-spacing-3xl));
      }

      /* Divider after section */
      .menu-section {
        background-color: transparent;
        padding: calc(1px * var(--nh-spacing-md)) 0;
      }
      .menu-section:not(:last-child) {
        border-bottom-width: 2px;
        border-bottom-style: solid;
        border-bottom-color: var(--nh-theme-bg-surface);
      }

      /* BG colors */
      .menu-item.active::part(base) {
        background: var(--nh-theme-bg-element);
      }
      .menu-item.active + .indented .menu-item.active::part(base) {
        background: var(--nh-theme-bg-surface);
      }
      .menu-item:not(.active):hover::part(base) {
        background: var(--nh-theme-bg-surface);
      }
    `,
  ];
}
