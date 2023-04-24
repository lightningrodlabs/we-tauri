import { css, html, LitElement } from "lit";
import { provide } from "@lit-labs/context";
import { customElement, property } from "lit/decorators.js";

import { weServicesContext } from "../context.js";
import { WeServices } from "../types.js";

@customElement("we-services-context")
export class GatherContext extends LitElement {
  @provide({ context: weServicesContext })
  @property({ type: Object })
  services!: WeServices;

  render() {
    return html`<slot></slot>`;
  }

  static styles = css`
    :host {
      display: contents;
    }
  `;
}
