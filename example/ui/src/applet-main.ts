import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";

import { localized, msg } from "@lit/localize";
import { sharedStyles } from "@holochain-open-dev/elements";

import "./elements/all-posts.js";
import "./elements/create-post.js";

@localized()
@customElement("applet-main")
export class AppletMain extends LitElement {

  @state()
  mediumInterval: number | null = null;

  @state()
  highInterval: number | null = null;

  // firstUpdated() {
  //   this.mediumInterval = window.setInterval(() => {
  //     this.dispatchEvent(new CustomEvent('notification', {
  //       detail: {
  //         title: "New Message",
  //         body: "Hello from the test app :)",
  //         notification_type: "default",
  //         icon_src: "https://static-00.iconduck.com/assets.00/duckduckgo-icon-512x512-zp12dd1l.png",
  //         urgency: "medium",
  //       },
  //       bubbles: true,
  //     }))
  //   }, 5000);

  //   this.highInterval = window.setInterval(() => {
  //     this.dispatchEvent(new CustomEvent('notification', {
  //       detail: {
  //         title: "Important Message",
  //         body: "This is an URGENT message",
  //         notification_type: "default",
  //         icon_src: "https://static-00.iconduck.com/assets.00/duckduckgo-icon-512x512-zp12dd1l.png",
  //         urgency: "high",
  //       },
  //       bubbles: true,
  //     })),
  //     40000
  //   })
  // }

  // disconnectedCallback(): void {
  //   if (this.mediumInterval) {
  //     window.clearInterval(this.mediumInterval);
  //   }
  //   if (this.highInterval) {
  //     window.clearInterval(this.highInterval);
  //   }
  // }

  sendUrgentNotification(delay: number) {
    setTimeout(() => {
      this.dispatchEvent(new CustomEvent('notification', {
        detail: {
          title: "Title",
          body: "Message body",
          notification_type: "default",
          icon_src: "https://static-00.iconduck.com/assets.00/duckduckgo-icon-512x512-zp12dd1l.png",
          urgency: "high",
        },
        bubbles: true,
      }))
    }, delay);
  }

  sendMediumNotification(delay: number) {
    setTimeout(() => {
      this.dispatchEvent(new CustomEvent('notification', {
        detail: {
          title: "Title",
          body: "Message body",
          notification_type: "default",
          icon_src: "https://static-00.iconduck.com/assets.00/duckduckgo-icon-512x512-zp12dd1l.png",
          urgency: "medium",
        },
        bubbles: true,
      }))
    }, delay);
  }

  render() {
    return html`
      <div class="column">
        <div class="row">
          <create-post></create-post>
          <all-posts></all-posts>
        </div>

        <div class="column center-content" style="margin-top: 50px;">
          <button @click=${() => this.sendUrgentNotification(0)}>Send Urgent Notification</button>
          <button @click=${() => this.sendMediumNotification(0)}>Send Medium Notification</button>

          <button @click=${() => this.sendUrgentNotification(5000)}>Send Urgent Notification with 5 seconds delay</button>
          <button @click=${() => this.sendMediumNotification(5000)}>Send Medium Notification with 5 seconds delay</button>
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
