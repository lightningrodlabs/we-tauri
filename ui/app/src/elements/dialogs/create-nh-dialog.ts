import { html, css, CSSResult} from "lit";
import { state, property } from "lit/decorators.js";

import { contextProvided } from "@lit-labs/context";
import { SlInput, SlTooltip} from '@scoped-elements/shoelace';

import { matrixContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { NHComponentShoelace, NHDialog, NHSelectAvatar } from "@neighbourhoods/design-system-components";
import { InferType, object, string } from "yup";

const NH_DEFAULT_LOGO = "PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHZpZXdCb3g9IjAgMCA4OCA4OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijg4IiBoZWlnaHQ9Ijg4IiBmaWxsPSIjMTgxNTFCIi8+CjxyZWN0IHdpZHRoPSI4OCIgaGVpZ2h0PSI4OCIgZmlsbD0iIzI1MUYyOCIvPgo8cGF0aCBkPSJNMjYuNTAxMiA1Mi4zNDc1QzI2LjUwMTIgNTIuMzQ3NSAyNi41MDEyIDcwIDkuMDAxNjUgNzBWMzQuNjk1MkM5LjAwMTY1IDM0LjY5NTIgOS4wMDE2NSAxNy4wNDI3IDI2LjUwMTIgMTcuMDQyN0MyNi41MDEyIDE3LjA0MjcgMjYuNTAxMiAzNC42OTUxIDQ0LjAwMDggMzQuNjk1MUM2MS41MDA0IDM0LjY5NTIgNjEuNTAwNCA1Mi4zNDc2IDYxLjUwMDQgNTIuMzQ3NlYxNy4wNDI3QzYxLjUwMDQgMTcuMDQyNyA3OSAxNy4wNDI3IDc5IDM0LjY5NTFWNTIuMzQ3NUM3OSA1Mi4zNDc1IDc5IDY5Ljk5OTkgNjEuNTAwNCA3MEw0NC4wMDA4IDcwQzQ0LjAwMDggNzAgNDQuMDAwOCA1Mi4zNDc1IDI2LjUwMTIgNTIuMzQ3NVoiIGZpbGw9InVybCgjcGFpbnQwX3JhZGlhbF8xMTYzXzYxMCkiLz4KPHBhdGggZD0iTTY0LjIzMzEgMTcuMDAyN0M2Mi41OTI1IDE3LjAwNzEgNjEuNDk4NyAxNy4wMjA1IDYxLjQ5ODcgMTcuMDQyN0M2MS40OTg3IDM0LjY5NSA0My45OTkyIDM0LjY5NTIgNDMuOTk5MiAzNC42OTUyQzQzLjk5OTIgMzQuNjk1MiA0My45OTkyIDE3LjA0MjYgMjYuNDk5NiAxNy4wNDI3QzIwLjQxOTIgMTcuMDQyNyAxNi40NTM5IDE5LjE3NTUgMTMuODY0OCAyMS45NTY4QzExLjExMDkgMjQuNTY4NiA5IDI4LjU2NjcgOSAzNC42OTUyVjcwQzkuMDY2MTQgNzAgOS4xMzAwNyA2OS45OTggOS4xOTU3NyA2OS45OTc2QzkuMTk4MzMgNjkuOTk3NSA5LjIwNDU4IDY5Ljk5NzcgOS4yMDg5OSA2OS45OTc2QzE1LjE3MSA2OS45NDkxIDE5LjA3NzMgNjcuODM3MiAyMS42MzY1IDY1LjA4OEMyNC4zOTAzIDYyLjQ3NjIgMjYuNTAxMyA1OC40NzU5IDI2LjUwMTMgNTIuMzQ3Nkg2MS41MDA0QzU1LjQyIDUyLjM0NzYgNTEuNDU0OCA1NC40ODAzIDQ4Ljg2NTYgNTcuMjYxNkM0Ni4xMTE4IDU5Ljg3MzUgNDQuMDAwOCA2My44NzE1IDQ0LjAwMDggNzBINjEuMjYzNUg2MS41MDAzQzc4Ljk5OTggNzAgNzguOTk5OCA1Mi4zNDc2IDc4Ljk5OTggNTIuMzQ3NlY1Mi4yOTQ2VjMyLjM0MTVWMTcuMDQyOEM3OC45OTk4IDE3LjA0MjggNjkuMTU0OCAxNi45ODcxIDY0LjIzMzEgMTcuMDAyN1oiIGZpbGw9InVybCgjcGFpbnQxX3JhZGlhbF8xMTYzXzYxMCkiLz4KPGRlZnM+CjxyYWRpYWxHcmFkaWVudCBpZD0icGFpbnQwX3JhZGlhbF8xMTYzXzYxMCIgY3g9IjAiIGN5PSIwIiByPSIxIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSg2MS41MDA0IDUyLjM0NzYpIHJvdGF0ZSgtNDkuMzgyNykgc2NhbGUoNDUuODUgNjcuNzg5KSI+CjxzdG9wIHN0b3AtY29sb3I9IndoaXRlIiBzdG9wLW9wYWNpdHk9IjAuOTk2MDc4Ii8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0id2hpdGUiIHN0b3Atb3BhY2l0eT0iMCIvPgo8L3JhZGlhbEdyYWRpZW50Pgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50MV9yYWRpYWxfMTE2M182MTAiIGN4PSIwIiBjeT0iMCIgcj0iMSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIGdyYWRpZW50VHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjYuNTAwOCAxNy4wNDMxKSByb3RhdGUoMTAzLjM4Mikgc2NhbGUoNzAuMDQ1OCA4Ny44MTY0KSI+CjxzdG9wIHN0b3AtY29sb3I9IndoaXRlIiBzdG9wLW9wYWNpdHk9IjAuOTk2MDc4Ii8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0id2hpdGUiIHN0b3Atb3BhY2l0eT0iMCIvPgo8L3JhZGlhbEdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPgo="

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
        .handleClose=${() => {console.log('object :>> ')}}
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