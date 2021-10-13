import { ref } from "lit/directives/ref.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { StandaloneRenderer } from "../renderers/types";

export class WeRender extends ScopedElementsMixin(LitElement) {
  @property()
  renderer!: StandaloneRenderer;

  renderRenderer(element: Element | undefined) {
    if (element) {
      this.renderer(element as HTMLElement, this);
    }
  }

  render() {
    return html`<div ${ref(e=> this.renderRenderer(e))}></div>`;
  }
}
