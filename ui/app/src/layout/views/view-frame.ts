import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { weStyles } from "../../shared-styles.js";

@customElement("view-frame")
export class ViewFrame extends LitElement {
  @property()
  globalVars: any;

  @property()
  appletId!: string;

  @property()
  initFrameJs!: string;

  @query("#view-frame")
  iframe!: HTMLIFrameElement;

  onLoad() {
    const styleChild = this.iframe.contentDocument!.createElement("style");
    styleChild.innerHTML =
      "body {margin: 0; height: 100%; width: 100%; display: flex;} ";
    this.iframe.contentDocument!.body.appendChild(styleChild);

    const iframe = this.iframe;

    if (this.globalVars) {
      for (const [key, value] of Object.entries(this.globalVars)) {
        this.iframe.contentWindow![key] = value;
      }
    }
    const scriptChild = iframe.contentDocument!.createElement("script");
    scriptChild.type = "module";
    scriptChild.innerHTML = `
      import('/applet/${this.appletId}/index.js').then(m => { const applet = m.default;  
      (${this.initFrameJs})(applet, document.body, window) });`;
    // setTimeout(() => {
    iframe.contentDocument!.body.appendChild(scriptChild);
    // });
  }

  render() {
    return html`<iframe
      id="view-frame"
      src="tauri://localhost/applet/${this.appletId}"
      @load=${() => this.onLoad()}
      style="flex: 1"
    ></iframe>`;
  }

  static styles = [
    css`
      :host {
        display: flex;
      }
    `,
    weStyles,
  ];
}
