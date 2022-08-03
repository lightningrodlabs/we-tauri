import { ref } from "lit/directives/ref.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { css, html, LitElement } from "lit";
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
      this.renderer(element as HTMLElement, this.registry);
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
