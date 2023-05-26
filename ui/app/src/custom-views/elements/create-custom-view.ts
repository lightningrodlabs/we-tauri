import { LitElement, html, css } from "lit";
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

import "grapes-editor";

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

  @query("grapes-editor")
  editor!: any;

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
  @query("form")
  form!: HTMLFormElement;

  async createCustomView(fields: any) {
    if (this.committing) return;

    const editor = this.editor.editor;

    const name = fields.name;

    const css = editor.getCss();
    const js = editor.getJs();
    const html = editor.getHtml();

    const customView: CustomView = {
      name,
      html,
      js,
      css: css || "",
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
    return html`
      <div class="column" style="flex: 1">
        <form
          class="row"
          ${onSubmit((f) => this.createCustomView(f))}
          style="align-items: center; padding: 16px; background-color: white"
        >
          <sl-input
            name="name"
            required
            .placeholder=${msg("Custom View Name")}
          ></sl-input>
          <span style="flex:1"> </span>
          <sl-button
            style="margin-right: 8px"
            @click=${() =>
              this.dispatchEvent(new CustomEvent("create-cancelled"))}
            >${msg("Cancel")}</sl-button
          >
          <sl-button variant="primary" type="submit" .loading=${this.committing}
            >${msg("Create Custom View")}</sl-button
          >
        </form>
        <grapes-editor style="flex: 1"></grapes-editor>
      </div>
    `;
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
      }
    `,
  ];
}
