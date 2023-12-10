import { css, CSSResult, html } from "lit";
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
};

export default class NHMenu extends NHComponentShoelace {
  @property()
  theme: string = "dark";

  @state()
  selectedMenuItemId!: string; // sectionName concatenated with sectionMember index e.g. Sensemaker-0
  @property()
  menuSectionDetails: MenuSection[] = [
    {
      sectionName: "Sensemaker",
      sectionMembers: [
        {
          label: "0",
          callback: () => {
            console.log("hi!");
          },
        },
      ],
    },
  ];

  renderTopLevel() {
    return html`
      ${this.menuSectionDetails.map(({ sectionName, sectionMembers }) => {
        return html`
          <sl-menu class="dashboard-menu-section">
            <sl-menu-label class="menu-section-label"
              >${sectionName}</sl-menu-label
            >
            ${sectionMembers.map(({ label, callback }, idx) => {
              return html`<sl-menu-item
                class="menu-item ${classMap({
                  active: this.selectedMenuItemId === sectionName + idx,
                })}"
                value="${label}"
                @click=${() => {
                  this.selectedMenuItemId = sectionName + idx;
                  callback();
                }}
                >${label}
              </sl-menu-item>`;
            })}
          </sl-menu>
        `;
        // <div role="navigation" class="sub-nav indented">
        //   ${applet?.appletRenderInfo?.resourceNames &&
        //   applet?.appletRenderInfo?.resourceNames.map(
        //     (resource, resourceIndex) => html`<sl-menu-item
        //       class="nav-item"
        //       value="${resource.toLowerCase()}"
        //       @click=${() => {
        //         this.selectedAppletIndex = i;
        //         this.selectedResourceDefIndex = resourceIndex;
        //         this.setupAssessmentsSubscription();
        //       }}
        //       >${resource}</sl-menu-item
        //     >`,
        //   )}
        // </div>
      })}
    `;
  }

  static elementDefinitions = {
    "sl-menu": SlMenu,
    "sl-menu-item": SlMenuItem,
    "sl-menu-label": SlMenuLabel,
  };

  render() {
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

      .container {
      }
      .container.light {
      }
      .container.dark {
      }

      /* Content */

      .content {
      }

      /* Actions */
    `,
  ];
}
