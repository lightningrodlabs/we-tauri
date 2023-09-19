import { html, css, CSSResult} from "lit";
import { state, query, property } from "lit/decorators.js";

import { contextProvided } from "@lit-labs/context";
import { SlInput} from '@scoped-elements/shoelace';

import { SelectAvatar } from "@holochain-open-dev/elements";

import { matrixContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { NHComponentShoelace, NHDialog } from "@neighbourhoods/design-system-components";

/**
 * @element we-applet
 */
export class CreateWeGroupDialog extends NHComponentShoelace {
  /** Dependencies */
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;
  
  @property()
  button!: HTMLElement;
  
  /** Private properties */
  @query("#name-field")
  _nameField!: HTMLInputElement;
  @query("#select-avatar")
  _avatarField!: SelectAvatar;
  @state()
  _name: string | undefined;
  @state()
  _logoSrc: string | undefined;
  @property()
  _primaryButtonDisabled: boolean = false;

  reset() {
    this._name = "";
    this._logoSrc = "";
  }
  
  private async handleOk(e: any) {
    if (this._name && this._logoSrc) {
      this.dispatchEvent(new CustomEvent("creating-we", {})); // required to display loading screen in the dashboard
      const weId = await this._matrixStore.createWeGroup(this._name!, this._logoSrc!);

      this.dispatchEvent(
        new CustomEvent("we-added", {
          detail: weId,
          bubbles: true,
          composed: true,
        })
      );
      this.reset();
      this._avatarField.clear();
    }
  }

  render() {
    return html`
      <nh-dialog
        id="dialog"
        dialogType="create-neighbourhood"
        title="Create Neighbourhood"
        handleOk=${this.handleOk.bind(this)} 
        openButtonRef=${this.button}
        .primaryButtonDisabled=${this._primaryButtonDisabled}
      >
        <div slot="inner-content" class="row">
          <select-avatar
            id="select-avatar"
            style="margin-top: 2rem;"
            @avatar-selected=${(e) => {this._logoSrc = e.detail.avatar; this._primaryButtonDisabled = (!this._logoSrc || !this._name ); this.requestUpdate(); }}
          ></select-avatar>

          <sl-input
            type="text"
            id="name-field"
            size="medium"
            placeholder="Name"
            @sl-input=${(e) => {this._name = e.target.value; this._primaryButtonDisabled = (!this._logoSrc || !this._name ); this.requestUpdate(); }}
            style="margin-left: 16px"
            required
          ></sl-input>
        </div>
      </nh-dialog>
    `;
  }

  static get elementDefinitions() {
    return {
      "select-avatar": SelectAvatar,
      "sl-input": SlInput,
      'nh-dialog' : NHDialog
    };
  }
  static styles : CSSResult[] = [
      super.styles as CSSResult,
      css`
      `,
    ];
}