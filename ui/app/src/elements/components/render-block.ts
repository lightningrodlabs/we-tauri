import { ref } from "lit/directives/ref.js";
import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { Renderer } from "@neighbourhoods/nh-launcher-applet";

export class RenderBlock extends LitElement {
  @property()
  renderer!: Renderer;

  registry?: CustomElementRegistry;

  renderRenderer(element: Element | undefined) {
    if (element) {
      this.renderer(element as HTMLElement, this.registry || customElements);
    }
  }

  override createRenderRoot() {
    this.registry = new CustomElementRegistry()

    const renderRoot = (this.renderOptions.creationScope = this.attachShadow({
      mode: 'open',
      customElements: this.registry,
    }));

    return renderRoot;
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
