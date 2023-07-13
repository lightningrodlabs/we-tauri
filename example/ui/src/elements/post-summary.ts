import { LitElement, html } from "lit";
import { state, property, customElement } from "lit/decorators.js";
import { EntryHash, Record, ActionHash } from "@holochain/client";
import { EntryRecord } from "@holochain-open-dev/utils";
import { StoreSubscriber } from "@holochain-open-dev/stores";
import { hashProperty, sharedStyles } from "@holochain-open-dev/elements";
import { consume } from "@lit-labs/context";

import { localized, msg } from "@lit/localize";

import "@shoelace-style/shoelace/dist/components/card/card.js";

import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import { PostsStore } from "../posts-store";
import { postsStoreContext } from "../context";
import { Post } from "../types";

/**
 * @element post-summary
 * @fires post-selected: detail will contain { postHash }
 */
@localized()
@customElement("post-summary")
export class PostSummary extends LitElement {
  // REQUIRED. The hash of the Post to show
  @property(hashProperty("post-hash"))
  postHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: postsStoreContext, subscribe: true })
  postsStore!: PostsStore;

  /**
   * @internal
   */
  _post = new StoreSubscriber(
    this,
    () => this.postsStore.posts.get(this.postHash),
    () => [this.postHash]
  );

  renderSummary(entryRecord: EntryRecord<Post>) {
    return html`
      <div style="display: flex; flex-direction: column">
        <div style="display: flex; flex-direction: column; margin-bottom: 16px">
          <span style="margin-bottom: 8px"
            ><strong>${msg("Title")}:</strong></span
          >
          <span style="white-space: pre-line">${entryRecord.entry.title}</span>
        </div>

        <div style="display: flex; flex-direction: column; margin-bottom: 16px">
          <span style="margin-bottom: 8px"
            ><strong>${msg("Content")}:</strong></span
          >
          <span style="white-space: pre-line"
            >${entryRecord.entry.content}</span
          >
        </div>
      </div>
    `;
  }

  renderPost() {
    switch (this._post.value.status) {
      case "pending":
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case "complete":
        if (!this._post.value.value)
          return html`<span>${msg("The requested post doesn't exist")}</span>`;

        return this.renderSummary(this._post.value.value);
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the post")}
          .error=${this._post.value.error}
        ></display-error>`;
    }
  }

  render() {
    return html`<sl-card
      style="flex: 1; cursor: grab;"
      @click=${() =>
        this.dispatchEvent(
          new CustomEvent("post-selected", {
            composed: true,
            bubbles: true,
            detail: {
              postHash: this.postHash,
            },
          })
        )}
    >
      ${this.renderPost()}
    </sl-card>`;
  }

  static styles = [sharedStyles];
}