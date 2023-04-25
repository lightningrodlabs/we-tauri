import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import {
  AppletToParentRequest,
  ParentToIframeMessage,
  RenderView,
} from "applet-messages";
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

  @property()
  messageHandler!: (request: AppletToParentRequest) => any;

  async onLoad() {
    const info = await getConductorInfo();

    const { port1, port2 } = new MessageChannel();

    this.iframe.contentWindow!.postMessage(
      {
        message: this.renderView,
        appPort: info.app_port,
      } as ParentToIframeMessage,
      `applet://${this.appletId}`,
      [port2]
    );
    const childWindow = this.iframe.contentWindow!;
    window.addEventListener("message", async (message) => {
      if (message.source === childWindow) {
        const result = await this.messageHandler(message.data);
        message.ports[0].postMessage(result);
      }
    });
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
