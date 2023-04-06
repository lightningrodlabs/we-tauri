import { html, css, LitElement, PropertyValueMap } from "lit";
import { state, query, property, customElement } from "lit/decorators.js";

import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";

import "@holochain-open-dev/elements/elements/select-avatar.js";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";

import { weStyles } from "../shared-styles.js";
import { weStoreContext } from "../context.js";
import { WeStore } from "../we-store.js";
import { notifyError, onSubmit } from "@holochain-open-dev/elements";

/**
 * @element create-group-dialog
 */
@localized()
@customElement("create-group-dialog")
export class CreateGroupDialog extends LitElement {
  /** Dependencies */
  @consume({ context: weStoreContext, subscribe: true })
  _weStore!: WeStore;

  async open() {
    this._dialog.show();
  }

  /** Private properties */
  @query("#dialog")
  _dialog!: SlDialog;

  @query("form")
  form!: HTMLFormElement;

  @state()
  committing = false;

  private async createGroup(fields: any) {
    if (this.committing) return;

    this.committing = true;

    try {
      const groupDnaHash = await this._weStore.createGroup(
        fields.name,
        fields.logo_src
      );

      this.dispatchEvent(
        new CustomEvent("group-created", {
          detail: { groupDnaHash },
          bubbles: true,
          composed: true,
        })
      );
      this._dialog.hide();
      this.form.reset();
    } catch (e) {
      notifyError(msg("Error creating the group."));
      console.error(e);
    }
    this.committing = false;
  }

  render() {
    return html`
      <sl-dialog id="dialog" .label=${msg("Create Group")}>
        <form class="column" ${onSubmit((f) => this.createGroup(f))}>
          <div class="row" style="justify-content: center">
            <select-avatar required name="logo_src"></select-avatar>

            <sl-input
              name="name"
              style="margin-left: 16px"
              .label=${msg("Group name")}
              required
            ></sl-input>
          </div>

          <sl-button style="margin-top: 24px" variant="primary" type="submit">
            ${msg("Create Group")}
          </sl-button>
        </form>
      </sl-dialog>
    `;
  }
  static get styles() {
    return [
      weStyles,
      css`
        mwc-textfield {
          margin-top: 10px;
        }
      `,
    ];
  }
}
