import { ref } from "lit/directives/ref.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { Renderer } from "@lightningrodlabs/we-applet";

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
      console.log(this);
      debugger
      this.renderer(element as HTMLElement, this.registry);
    }
  }

  render() {
    return html`<div ${ref(e=> this.renderRenderer(e))}></div>`;
  }
}
