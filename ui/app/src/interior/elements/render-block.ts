import { ref } from "lit/directives/ref.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { Renderer } from "../../we-game";

export class RenderBlock extends ScopedElementsMixin(LitElement) {
  @property()
  renderer!: Renderer;

  renderRenderer(element: Element | undefined) {
    if (element) {
      this.renderer(element as HTMLElement, this.registry);
    }
  }

  render() {
    return html`<div ${ref(e=> this.renderRenderer(e))}></div>`;
  }
}
