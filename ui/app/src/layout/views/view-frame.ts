import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { ParentToIframeMessage, RenderView } from "applet-messages";
import { weStyles } from "../../shared-styles.js";
import { getConductorInfo } from "../../tauri.js";

@customElement("view-frame")
export class ViewFrame extends LitElement {
  @property()
  appletId!: string;

  @query("#view-frame")
  iframe!: HTMLIFrameElement;

  @property()
  renderView!: RenderView;

  async onLoad() {
    const info = await getConductorInfo();

    this.iframe.contentWindow!.postMessage(
      {
        message: this.renderView,
        appPort: info.app_port,
      } as ParentToIframeMessage,
      `applet://${this.appletId}`
    );

    // const iframe = this.iframe;

    // if (this.globalVars) {
    //   for (const [key, value] of Object.entries(this.globalVars)) {
    //     this.iframe.contentWindow![key] = value;
    //   }
    // }
    // const scriptChild = iframe.contentDocument!.createElement("script");
    // scriptChild.type = "module";
    // scriptChild.innerHTML = `
    //   import('/index.js').then(m => { const applet = m.default;
    //   (${this.initFrameJs})(applet, document.body, window) });`;
  }

  render() {
    return html`<iframe
      id="view-frame"
      src="applet://${this.appletId}"
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
