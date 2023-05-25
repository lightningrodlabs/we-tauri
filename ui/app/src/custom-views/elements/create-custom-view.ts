import { LitElement, html } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { state, property, query, customElement } from "lit/decorators.js";
import {
  ActionHash,
  Record,
  DnaHash,
  AgentPubKey,
  EntryHash,
} from "@holochain/client";
import { EntryRecord } from "@holochain-open-dev/utils";
import {
  hashProperty,
  notifyError,
  hashState,
  sharedStyles,
  onSubmit,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";
import { mdiAlertCircleOutline, mdiDelete } from "@mdi/js";

import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";

import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";
import { CustomViewsStore } from "../custom-views-store.js";
import { customViewsStoreContext } from "../context.js";
import { CustomView } from "../types.js";

/**
 * @element create-custom-view
 * @fires custom-view-created: detail will contain { customViewHash }
 */
@localized()
@customElement("create-custom-view")
export class CreateCustomView extends LitElement {
  // REQUIRED. The html for this CustomView
  @property()
  html!: string;

  // REQUIRED. The js for this CustomView
  @property()
  js!: string;

  // REQUIRED. The css for this CustomView
  @property()
  css!: string;

  /**
   * @internal
   */
  @consume({ context: customViewsStoreContext, subscribe: true })
  customViewsStore!: CustomViewsStore;

  /**
   * @internal
   */
  @state()
  committing = false;

  /**
   * @internal
   */
  @query("#create-form")
  form!: HTMLFormElement;

  async createCustomView(fields: any) {
    if (this.html === undefined)
      throw new Error("Cannot create a new Custom View without its html field");
    if (this.js === undefined)
      throw new Error("Cannot create a new Custom View without its js field");
    if (this.css === undefined)
      throw new Error("Cannot create a new Custom View without its css field");

    const customView: CustomView = {
      html: this.html,
      js: this.js,
      css: this.css,
    };

    try {
      this.committing = true;
      const record: EntryRecord<CustomView> =
        await this.customViewsStore.client.createCustomView(customView);

      this.dispatchEvent(
        new CustomEvent("custom-view-created", {
          composed: true,
          bubbles: true,
          detail: {
            customViewHash: record.actionHash,
          },
        })
      );

      this.form.reset();
    } catch (e: any) {
      console.error(e);
      notifyError(msg("Error creating the custom view"));
    }
    this.committing = false;
  }

  render() {
    return html` <sl-card style="flex: 1;">
      <span slot="header">${msg("Create Custom View")}</span>

      <form
        id="create-form"
        style="display: flex; flex: 1; flex-direction: column;"
        ${onSubmit((fields) => this.createCustomView(fields))}
      >
        <sl-button variant="primary" type="submit" .loading=${this.committing}
          >${msg("Create Custom View")}</sl-button
        >
      </form>
    </sl-card>`;
  }

  static styles = [sharedStyles];
}
