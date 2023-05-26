import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import grapesjs, { Editor } from "grapesjs";
import plugin from "grapesjs-preset-webpage";
// @ts-ignore
import grapesCss from "grapesjs/dist/css/grapes.min.css";

export interface RenderTemplate {
  html: string;
  js: string;
  css: string;
}

@customElement("grapes-editor")
export class GrapesEditor extends LitElement {
  @property()
  template: RenderTemplate | undefined;

  @query("#editor")
  editorEl!: HTMLElement;

  editor!: Editor;

  firstUpdated() {
    const s = document.createElement("style");
    s.innerHTML = ".gjs-bdrag {display: none! important;}";
    document.body.appendChild(s);

    this.addEventListener("dragend", (e) => {
      e.stopPropagation();
    });
    this.addEventListener("dragenter", (e) => {
      e.stopPropagation();
    });
    this.addEventListener("dragleave", (e) => {
      e.stopPropagation();
    });
    this.addEventListener("dragover", (e) => {
      e.stopPropagation();
    });
    this.addEventListener("dragstart", (e) => {
      e.stopPropagation();
    });
    this.addEventListener("drop", (e) => {
      e.stopPropagation();
    });
    this.addEventListener("drag", (e) => {
      e.stopPropagation();
    });
    this.editor = grapesjs.init({
      container: this.editorEl,
      components: this.template?.html,
      style: this.template?.css,
      height: "auto",
      jsInHtml: false,
      nativeDnD: false,
      storageManager: false,
      plugins: [plugin],
    });
  }

  render() {
    return html`<div id="editor" style="flex:1"></div>`;
  }

  static styles = [
    grapesCss,
    css`
      :host {
        display: flex;
      }

      .gjs-block::before {
        content: unset !important;
      }

      .gjs-block {
        min-height: 30px;
      }

      :host {
        display: flex;
        font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
          Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
      }
      /* Let's highlight canvas boundaries */
      #grapes-container {
        flex: 1;
      }
    `,
  ];
}
