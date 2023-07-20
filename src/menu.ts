import { css, CSSResult, html, unsafeCSS } from "lit";
import { StaticValue, html as litHtml, literal } from "lit/static-html.js";
import { customElement, property } from "lit/decorators.js";
import { NHComponentShoelace } from "neighbourhoods-design-system-components";
import { sharedStyles } from "./sharedStyles";
import { classMap } from "lit/directives/class-map.js";
import "./button";

export const capitalize = (part: string) =>
  part[0].toUpperCase() + part.slice(1);

@customElement("nh-menu")
export class NHCard extends NHComponentShoelace {
  @property()
  direction: "vertical" | "horizontal" = "horizontal";
  @property()
  itemLabels: string[] = ["posts", "pages", "popular"];
  @property()
  itemComponentTag: any = literal`nh-button`;
  @property()
  itemComponentProps: object = {};
  @property()
  theme: string = "dark";
  @property()
  fixedFirstItem: boolean = true;

  render() {
    return html`
      <div
        class="container${classMap({
          dark: this.theme == "dark",
          [this.direction]: !!this.direction,
        })}"
      >
        <div
          class="content${classMap({
            [this.direction]: !!this.direction,
          })}"
        >
          ${this.itemLabels
            ? this.itemLabels.map(
                (label, i) =>
                  litHtml`<${
                    this.itemComponentTag // Dynamically render passed in component tag
                  }
                    label=${label}
                    id=${`menu-${this.direction}-item-${i}`}
                    class="menu-item"
                    name=${`menu-${
                      this.direction
                    }-${label.toLowerCase()}`}
                  >
                    ${capitalize(label)}
                  </${
                    this.itemComponentTag
                  }>`
              )
            : null}
          <slot name="extra-item"></slot>
        </div>
        <slot name="actions"></slot>
      </div>
    `;
  }

  static styles: CSSResult[] = [
    // super.styles as CSSResult,
    css`
      ${unsafeCSS(sharedStyles)}

      /* Layout */
      :host {
        grid-column: 1 / -1;
      }
      .container.vertical {
        max-width: 50vw;
        flex-wrap: wrap;
        justify-content: center;
      }
      .container.horizontal {
        justify-content: start;
      }
      .menu-item,
      .container,
      .content {
        display: flex;
        width: 100%;
      }
      .vertical .menu-item {
        flex-basis: 100%;
      }

      .container {
        box-sizing: border-box;
        align-items: center;
        color: var(--nh-theme-fg-default);
        border-radius: calc(1px * var(--nh-radii-md));
        padding: calc(1px * var(--nh-spacing-sm));
      }
      .container.light {
        background-color: var(--nh-theme-bg-muted);
      }
      .container.dark {
        background-color: var(--nh-theme-bg-subtle);
      }

      /* Content */

      .content {
        gap: calc(1px * var(--nh-spacing-sm));
      }
      .content.vertical {
        flex-direction: column;
      }

      /* Actions */

      ::slotted([slot="actions"]) {
      }
      ::slotted([slot="exta-item"]) {
      }
    `,
  ];
}
