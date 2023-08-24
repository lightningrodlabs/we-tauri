import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { localized, msg } from "@lit/localize";
import { sharedStyles } from "@holochain-open-dev/elements";

import "./elements/all-posts.js";
import "./elements/create-post.js";
import { HrlWithContext, WeNotification, WeServices } from "@lightningrodlabs/we-applet";
import { AppAgentClient, encodeHashToBase64 } from "@holochain/client";

@localized()
@customElement("applet-main")
export class AppletMain extends LitElement {

  @property()
  client!: AppAgentClient;

  @property()
  weServices!: WeServices;

  @state()
  mediumInterval: number | null = null;

  @state()
  highInterval: number | null = null;

  @state()
  selectedHrl: HrlWithContext | undefined = undefined;

  @state()
  unsubscribe: undefined | (() => void);

  firstUpdated() {
    // console.log("@firstUpdated in example applet: Hello.");
    this.unsubscribe = this.client.on("signal", (signal) => console.log("Received signal: ", signal));
  }

  disconnectedCallback(): void {
    if (this.unsubscribe) this.unsubscribe();
  }

  sendUrgentNotification(delay: number) {
    const notification: WeNotification = {
      title: "Title",
      body: "Message body",
      notification_type: "default",
      icon_src: "https://static-00.iconduck.com/assets.00/duckduckgo-icon-512x512-zp12dd1l.png",
      urgency: "high",
      timestamp: Date.now(),
    };
    setTimeout(() => {
      this.dispatchEvent(new CustomEvent('notification', {
        detail: [notification],
        bubbles: true,
      }))
    }, delay);
  }

  sendMediumNotification(delay: number) {
    setTimeout(() => {
      const notification: WeNotification = {
        title: "Title",
        body: "Message body",
        notification_type: "default",
        icon_src: "https://static-00.iconduck.com/assets.00/duckduckgo-icon-512x512-zp12dd1l.png",
        urgency: "medium",
        timestamp: Date.now(),
      }
      this.dispatchEvent(new CustomEvent('notification', {
        detail: [notification],
        bubbles: true,
      }))
    }, delay);
  }

  sendLowNotification(delay: number) {
    const notification: WeNotification = {
      title: "Title",
      body: "Message body",
      notification_type: "default",
      icon_src: "https://static-00.iconduck.com/assets.00/duckduckgo-icon-512x512-zp12dd1l.png",
      urgency: "low",
      timestamp: Date.now(),
    }
    setTimeout(() => {
      this.dispatchEvent(new CustomEvent('notification', {
        detail: [notification],
        bubbles: true,
      }))
    }, delay);
  }

  async userSelectHrl() {
    const selectedHrl = await this.weServices.userSelectHrl();
    console.log("User selected HRL: ", selectedHrl);
    this.selectedHrl = selectedHrl;
  }

  render() {
    return html`
      <div class="column">
        <div class="row">
          <create-post style="margin: 16px;"></create-post>
          <all-posts
              style="margin: 16px;"
              @notification=${(e: CustomEvent) => {
                this.dispatchEvent(new CustomEvent('notification', {
                  detail: e.detail,
                  bubbles: true,
                }))
              }}
          ></all-posts>
        </div>


        <div class="column center-content" style="margin-top: 50px;">
          <button @click=${() => this.userSelectHrl()}>Select HRL</button>
          ${this.selectedHrl ? html`<div>User selected HRL: ${JSON.stringify({
            hrl: [encodeHashToBase64(this.selectedHrl.hrl[0]), encodeHashToBase64(this.selectedHrl.hrl[1])],
            context: this.selectedHrl.context,
            })
            }</div>`
            : html``
          }

          <button @click=${() => this.selectedHrl ? this.weServices.hrlToClipboard(this.selectedHrl) : alert("No HRL selected")}>Add selected HRL to We Clipboard</button>

          <button @click=${() => this.sendLowNotification(0)}>Send Low Urgency Notification</button>
          <button @click=${() => this.sendMediumNotification(0)}>Send Medium Urgency Notification</button>
          <button @click=${() => this.sendUrgentNotification(0)}>Send High Urgency Notification</button>

          <button @click=${() => this.sendLowNotification(5000)}>Send Low Urgency Notification with 5 seconds delay</button>
          <button @click=${() => this.sendMediumNotification(5000)}>Send Medium Urgency Notification with 5 seconds delay</button>
          <button @click=${() => this.sendUrgentNotification(5000)}>Send High Urgency Notification with 5 seconds delay</button>
        </div>
      </div>
    `;
  }

  static styles = [
    css`
      :host {
        display: flex;
        flex: 1;
      }
    `,
    sharedStyles,
  ];
}
