import { ref } from "lit/directives/ref.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { Renderer } from "@lightningrodlabs/we-game";

export class RenderBlock extends ScopedElementsMixin(LitElement) {
  @property()
  renderer!: Renderer;

  firstUpdated() {
    console.log("firstUpdated:", this)
  }

  renderRenderer(element: Element | undefined) {
    if (element) {
      console.log(this);
      this.renderer(element as HTMLElement, this.registry);
    }
  }

  render() {
    return html`<div ${ref(e=> this.renderRenderer(e))}></div>`;
  }
}
