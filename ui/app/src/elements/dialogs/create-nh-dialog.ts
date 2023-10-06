import { html, css, CSSResult} from "lit";
import { state, property } from "lit/decorators.js";

import { contextProvided } from "@lit-labs/context";
import { SlInput, SlTooltip} from '@scoped-elements/shoelace';

import { matrixContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { NHComponentShoelace, NHDialog, NHSelectAvatar } from "@neighbourhoods/design-system-components";
import { b64images } from "@neighbourhoods/design-system-styles";
import { InferType, object, string } from "yup";

const NH_DEFAULT_LOGO = b64images.nhIcons.logoCol;

export class CreateNeighbourhoodDialog extends NHComponentShoelace {
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  _neighbourhoodSchema = object({
    name: string().min(3, "Must be at least 3 characters").required(),
    image: string(),
  });

  _neighbourhood: InferType<typeof this._neighbourhoodSchema> = { name: "", image: "" };
  
  @property()
  openDialogButton!: HTMLElement;
  @property()
  _primaryButtonDisabled: boolean = false;
  @state()
  _avatarTooltip: string = "NH Image";

  reset() {
    this._neighbourhood.name = "";
    this._neighbourhood.image = "";
  }
  
  private async onSubmit(e: any) {
    const root = this.renderRoot;

    if(!this._neighbourhood.image) {
      this._neighbourhood.image = `data:image/svg+xml;base64,${NH_DEFAULT_LOGO}`
    }
    this._neighbourhoodSchema.validate(this._neighbourhood)
      .then(async valid => {
        if(!valid) throw new Error("Neighbourhood input data invalid");
        
        this.dispatchEvent(new CustomEvent("creating-we", {})); // required to display loading screen in the dashboard
        const weId = await this._matrixStore.createWeGroup(this._neighbourhood.name!, this._neighbourhood.image!);

        this.dispatchEvent(
          new CustomEvent("we-added", {
            detail: weId,
            bubbles: true,
            composed: true,
          })
        );
        this.reset();
        this.requestUpdate();
      })
      .catch((err) => {
        this._primaryButtonDisabled = true;
        const dialog = (root.querySelector("nh-dialog") as any).renderRoot.querySelector('sl-dialog');
        dialog.show() // Stop dialog from closing
        
        console.log("Error validating profile for field: ", err.path);
        
        const errorDOM = root.querySelectorAll("label[name=" + err.path + "]")
        if(errorDOM.length == 0) return;
        const asterisk : any = errorDOM[0];
        asterisk.style.visibility = 'visible';
        asterisk.style.opacity = '1';
        const slInput : any = asterisk.previousElementSibling;
        slInput.setCustomValidity(err.message)
        slInput.reportValidity()
      })
  }

  render() {
    return html`
      <nh-dialog
        id="dialog"
        dialogType="create-neighbourhood"
        title="Create Neighbourhood"
        .handleOk=${this.onSubmit.bind(this)}
        openButtonRef=${this.openDialogButton}
        .primaryButtonDisabled=${!this._neighbourhoodSchema.isValidSync(this._neighbourhood)}
      >
        <div slot="inner-content" class="row">
          <sl-tooltip content=${this._avatarTooltip} placement="bottom">
            <nh-select-avatar
              id="select-avatar"
              .shape=${'circle'}
              .label=${""}
              .value=${this._neighbourhood.image}
              .defaultValue=${NH_DEFAULT_LOGO}
              @avatar-selected=${(e) => {this._avatarTooltip = "Clear"; this._neighbourhood.image = e.detail.avatar; this.requestUpdate(); }}
            ></nh-select-avatar>
          </sl-tooltip>

          <sl-input
            type="text"
            id="name-field"
            name="name"
            size="medium"
            placeholder="Name"
            @sl-input=${(e) => { this._neighbourhood.name = e.target.value; this.requestUpdate(); }}
            value=${this._neighbourhood.name}
            style="margin-left: 16px"
            required
          ></sl-input>
          <label class="error" for="name" name="name">*</label>
        </div>
      </nh-dialog>
    `;
  }

  static get elementDefinitions() {
    return {
      "nh-select-avatar": NHSelectAvatar,
      "sl-tooltip": SlTooltip,
      "sl-input": SlInput,
      'nh-dialog' : NHDialog
    };
  }
  static styles : CSSResult[] = [
      super.styles as CSSResult,
      css`
        label {
          visibility: hidden;
          opacity: 0;
          display: flex;
          align-self: self-start;
          padding: 0 8px;
          flex: 1;
          flex-grow: 0;
          flex-basis: 8px;
          color: var(--nh-theme-error-default); 
        }
      `,
    ];
}