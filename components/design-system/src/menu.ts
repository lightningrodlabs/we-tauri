import { css, CSSResult, html } from "lit";
import { html as litHtml, literal } from "lit/static-html.js";
import {property } from "lit/decorators.js";
import { NHComponentShoelace } from "./ancestors/base";
import { classMap } from "lit/directives/class-map.js";
import NHButton from "./button";
import { b64images } from '@neighbourhoods/design-system-styles';

export default class NHMenu extends NHComponentShoelace {
  static elementDefinitions: {
    'nh-button': NHButton,
  }

  @property()
  direction: "vertical" | "horizontal" = "horizontal";
  @property()
  itemLabels: string[] = ["Button 1", "Button 2", "Button 3"];
  @property()
  itemComponentTag: any = literal`nh-button`;
  @property()
  itemComponentProps: any = { size: "md", iconImageB64: "" };
  @property()
  theme: string = "dark";
  @property()
  fixedFirstItem: boolean = true;
  @property()
  addItemButton: boolean = false;

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
                    id=${`menu-${this.direction}-item-${i}`}
                    name=${`menu-${this.direction}-${label.toLowerCase()}`}
                    class="menu-item${classMap({
                      fixed: this.fixedFirstItem && i == 0,
                    })}"
                    .fixed=${this.fixedFirstItem && i == 0}
                    .label=${label}
                    .iconImageB64=${this.itemComponentProps?.iconImageB64 || ""}
                    .size=${this.itemComponentProps?.size || "md"}
                  >
                    ${label !== "" ? label : label}
                  </${this.itemComponentTag}>`
              )
            : null}
            ${this.addItemButton ? html`<nh-button class="add-menu-item" .variant=${"primary"} .size=${"icon"} .iconImageB64=${b64images.icons.plus}></nh-button>`: null}
          <slot name="extra-item"></slot>
        </div>
        <slot name="actions"></slot>
      </div>
    `;
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
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
      .container,
      .content {
        display: flex;
        width: 100%;
      }
      .vertical .menu-item {
        flex-basis: 100%;
        width: 100%;
      }

      .container {
        box-sizing: border-box;
        align-items: center;
        color: var(--nh-theme-fg-default);
        border-radius: calc(1px * var(--nh-radii-md));
        padding: calc(1px * var(--nh-spacing-sm));
      }
      .container.light {
        background-color: var(--nh-theme-bg-detail);
      }
      .container.dark {
        background-color: var(--nh-theme-bg-surface);
      }

      /* Content */

      .content {
        gap: calc(1px * var(--nh-spacing-sm));
        align-items: center;
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
