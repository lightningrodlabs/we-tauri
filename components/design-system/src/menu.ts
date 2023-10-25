import { css, CSSResult, html } from "lit";
import { property } from "lit/decorators.js";
import { NHComponentShoelace } from "./ancestors/base";
import { classMap } from "lit/directives/class-map.js";

export default class NHMenu extends NHComponentShoelace {
  @property()
  theme: string = "dark";

  render() {
    return html`
      <div
        class="container${classMap({
          dark: this.theme == "dark",
        })}"
      >
      </div>
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
