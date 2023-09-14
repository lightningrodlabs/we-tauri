import { ref } from "lit/directives/ref.js";
import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin"
import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { Renderer } from "@neighbourhoods/nh-launcher-applet";

export class RenderBlock extends ScopedElementsMixin(LitElement) {
  @property()
  renderer!: Renderer;

  //@ts-ignore
  get registry() {
    //@ts-ignore
    return this.__registry;
  }

  //@ts-ignore
  set registry(registry) {
    //@ts-ignore
    this.__registry = registry;
  }

  renderRenderer(element: Element | undefined) {
    if (element) {
      this.renderer(element as HTMLElement, customElements);
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
