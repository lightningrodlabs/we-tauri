import { ref } from "lit/directives/ref.js";
import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin"
import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { Renderer } from "@neighbourhoods/nh-launcher-applet";

export class RenderBlock extends ScopedElementsMixin(LitElement) {
  @property()
  renderer!: Renderer;

  renderRenderer(element: Element | undefined) {
    if (element) {
      this.renderer(element as HTMLElement, this.constructor.registry || customElements);
    }
  }

  render() {
    return html`<div
      style="display: contents"
      ${ref((e) => this.renderRenderer(e))}
    ></div>`;
  }

  static styles = [
    css`
      :host {
        display: contents;
      }
    `,
  ];
}
