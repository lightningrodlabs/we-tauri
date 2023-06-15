import { html, css, CSSResult} from "lit";
import { state, query } from "lit/decorators.js";

import { contextProvided } from "@lit-labs/context";
import {
  SlDialog, SlInput, SlButton, SlButtonGroup
} from '@scoped-elements/shoelace';

import { SelectAvatar } from "@holochain-open-dev/elements";

import { matrixContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { NHComponentShoelace } from "neighbourhoods-design-system-components";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";

/**
 * @element we-applet
 */
export class CreateWeGroupDialog extends ScopedElementsMixin(NHComponentShoelace) {
  /** Dependencies */
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  async open() {
    this._name = "";
    this._logoSrc = "";
    this._dialog.show();
  }

  /** Private properties */
  @query("#dialog")
  _dialog;
  @query("#name-field")
  _nameField!: HTMLInputElement;
  @query("#select-avatar")
  _avatarField!: SelectAvatar;
  @state()
  _name: string | undefined;
  @state()
  _logoSrc: string | undefined;

  firstUpdated(): void {
    const dialog = this.renderRoot.querySelector('#dialog');
    const closeButton = dialog!.querySelector('#secondary-action-button'); 
    closeButton!.addEventListener('click', () => this._dialog.hide());
  }
  private async handleOk(e: any) {
    // if statement is required to prevent ENTER key to close the dialog while the button is disabled
    if (this._name && this._logoSrc) {
      this._dialog.hide();
      this.dispatchEvent(new CustomEvent("creating-we", {})); // required to display loading screen in the dashboard
      const weId = await this._matrixStore.createWeGroup(this._name!, this._logoSrc!);

      this.dispatchEvent(
        new CustomEvent("we-added", {
          detail: weId,
          bubbles: true,
          composed: true,
        })
      );
      this._nameField.value = "";
      this._avatarField.clear();
    }
  }

  render() {
    return html`
      <sl-dialog id="dialog" label="Create Neighbourhood">
        <div class="row body-container">
          <select-avatar
            id="select-avatar"
            @avatar-selected=${(e) => (this._logoSrc = e.detail.avatar)}
          ></select-avatar>

          <sl-input
            type="text"
            id="name-field"
            size="medium"
            placeholder="Name"
            @sl-input=${(e) => {(this._name = e.target.value)}}
            style="margin-left: 16px"
            required
          ></sl-input>
        </div>

        <sl-button-group class="button-container" slot="footer">
          <sl-button 
            size="large"
            variant="neutral"
            id="secondary-action-button"
          >
            Cancel
          </sl-button>
          <sl-button
            id="primary-action-button"
            size="large"
            variant="primary"
            .disabled=${!this._name || !this._logoSrc}
            @click=${this.handleOk}
          >
            Save
          </sl-button>
        </sl-button-group>
      </sl-dialog>
    `;
  }
  static get scopedElements() {
    return {
      "select-avatar": SelectAvatar,
      "sl-button": SlButton,
      "sl-button-group": SlButtonGroup,
      "sl-dialog": SlDialog,
      "sl-input": SlInput,
    };
  }
  static styles : CSSResult[] = [
      super.styles as CSSResult,
      css`
        .body-container, .button-container {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: padding: calc(1px * var(--nh-spacing-md));
        }
        .button-container {
          justify-content: end;
        }
        #primary-action-button::part(base), #secondary-action-button::part(base) {
          border-radius: calc(1px * var(--nh-radii-md));
          background-color: var(--nh-theme-bg-surface);
          color: var(--nh-theme-fg-default);
          font-weight: 500;
          width: calc(1rem * var(--nh-spacing-sm));
          border: none;

        }
        #secondary-action-button {
          margin-right: calc(1px * var(--nh-spacing-md));
        }
        #primary-action-button::part(base) {
          background-color: var(--nh-theme-bg-muted);
        }

        #name-field::part(base) {
          border: none;
          background-color: var(--nh-theme-bg-subtle);
          padding: calc(1px * var(--nh-spacing-md)) calc(1px * var(--nh-spacing-md));
          height: calc(1rem * var(--nh-spacing-xs));
        }
        #name-field::part(input) {
          color: var(--nh-theme-fg-default);
          height: auto !important;
          font-weight: 500;
        }
        #name-field::part(input)::placeholder {
          color: var(--nh-theme-input-placeholder);
          opacity: 1;
        }

        #dialog::part(panel) {
          border-radius: calc(1px * var(--nh-radii-xl));
          background-color: var(--nh-theme-bg-surface);
          max-height: 16rem;
        }
        #dialog::part(overlay),
        #dialog::part(base) {
          background-color: var(--nh-theme-bg-subtle-50);
          transition: opacity 1s ease-in-out;
        }
        #dialog::part(body),
        #dialog::part(footer),
        #dialog::part(header) {
          overflow: hidden;
          display: flext;
          justify-content: flex-start;
          padding: calc(1px * var(--nh-spacing-md));
          align-items: flex-start;
        }
        #dialog::part(title),
        #dialog::part(close-button) {
          text-transform: uppercase;
          font-weight: var(--nh-font-weights-body-bold);
          font-family: var(--nh-font-families-headlines);
          padding: calc(1px * var(--nh-spacing-sm));
          color: var(--nh-theme-fg-muted);
        }
        #dialog::part(title) {
          font-size: calc(1px * var(--nh-font-size-sm));
          letter-spacing:.5px;
        }
        #dialog::part(close-button):hover {
          color: var(--nh-theme-bg-canvas);
        }
        #dialog::part(close-button) {
          position: absolute;
          right: 0;
          top: 0;
        }
      `,
    ];
}
