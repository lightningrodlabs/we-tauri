import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { localized, msg } from "@lit/localize";
import { sharedStyles } from "@holochain-open-dev/elements";

import "./elements/all-posts.js";
import "./elements/create-post.js";
import "./elements/post-detail.js";
import "./elements/posts-context.js";

import { WeClient, type RenderInfo, getRenderInfo } from "@lightningrodlabs/we-applet";

import "@lightningrodlabs/we-applet/dist/elements/we-client-context.js";
import "@lightningrodlabs/attachments/dist/elements/attachments-context.js";

import "./applet-main.js";
import "./cross-applet-main.js";
import { PostsClient } from "./posts-client.js";
import { PostsStore } from "./posts-store.js";
import { AttachmentsClient, AttachmentsStore } from "@lightningrodlabs/attachments";

@localized()
@customElement("example-applet")
export class ExampleApplet extends LitElement {

  @state()
  weClient!: WeClient;

  @state()
  renderInfo!: RenderInfo;

  @state()
  postsStore: PostsStore | undefined;

  @state()
  attachmentsStore: AttachmentsStore | undefined;

  async firstUpdated() {
    this.weClient = await WeClient.connect();
    this.renderInfo = await getRenderInfo();
    if (this.renderInfo.type === "applet-view") {
      this.postsStore = new PostsStore(new PostsClient(this.renderInfo.appletClient, "forum"));
      this.attachmentsStore = new AttachmentsStore(new AttachmentsClient(this.renderInfo.appletClient, "forum"));
    }
  }

  render() {
    switch (this.renderInfo.type) {
      case "applet-view":
        switch (this.renderInfo.view.type) {
          case "main":
            return html`
              <posts-context .store=${this.postsStore}>
                <we-client-context .weClient=${this.weClient}>
                  <attachments-context .store=${this.attachmentsStore}>
                    <applet-main .client=${this.renderInfo.appletClient} .weClient=${this.weClient}></applet-main>
                  </attachments-context>
                </we-client-context>
              </we-client-context>
            `
          case "block":
            throw new Error("Block view is not implemented.");
          case "entry":
            switch (this.renderInfo.view.roleName) {
              case "forum":
                switch (this.renderInfo.view.integrityZomeName) {
                  case "posts_integrity":
                    switch (this.renderInfo.view.entryDefId) {
                      case "post":
                        return html`
                          <posts-context .store=${this.postsStore}>
                            <we-client-context .weClient=${this.weClient}>
                              <attachments-context .store=${this.attachmentsStore}>
                                <post-detail .hash=${this.renderInfo.view.hrl[1]}></post-detail>
                              </attachments-context>
                            </we-client-context>
                          </we-client-context>
                        `
                      default:
                        throw new Error("Unknown entry type");
                    }
                  default:
                    throw new Error("Unknown integrity zome");
                }
              default:
                throw new Error("Unknown role name");
            }
          default:
            throw new Error("Unknown applet-view type");
        }
      case "cross-applet-view":
        return html`
          <we-client-context .weClient=${this.weClient}>
            <cross-applet-main .applets=${this.renderInfo.applets}></cross-applet-main>
          </we-client-context>
        `;
      default:
        throw new Error("Unknown render view type");
    }
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
