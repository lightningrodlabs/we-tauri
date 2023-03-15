import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { css, html, LitElement } from "lit";
import { property, query } from "lit/decorators.js";
import { weStyles } from "../../shared-styles.js";

// TODO: use the ViewFrameInIframe component instead of the ViewFrame when moved to tauri
export class ViewFrame extends ScopedElementsMixin(LitElement) {
  @property()
  globalVars: any;

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
    scriptChild.src = "index.js";
    scriptChild.type = "module";
    // scriptChild.innerHTML =
    //   importfunction +
    //   " const js = `" +
    //   js +
    //   "`;importModuleFromText(js).then(m => { const applet = m.default;  (" +
    //   this.initFrameJs +
    //   ")(applet, document.body, window) });";
    // setTimeout(() => {
    iframe.contentDocument!.body.appendChild(scriptChild);
    // });
  }

  render() {
    return html`<iframe
      id="view-frame"
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
