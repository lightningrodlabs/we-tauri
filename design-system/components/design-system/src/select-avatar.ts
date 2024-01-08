import { CSSResult, css, html } from "lit";
import { property, query, state } from "lit/decorators.js";
import { NHComponent } from "./ancestors/base.js";
import { SlAvatar, SlTooltip } from "@shoelace-style/shoelace";
import NHButton from "./button.js";

export default class NHSelectAvatar extends NHComponent {
    @property()
    name = "avatar";
    @property()
    required = false;
    @property()
    shape: "circle" | 'rounded'| 'square' = 'circle';
    @property()
    disabled = false;
    @property()
    label = "Avatar";
    @property() // Purple Neighbourhoods user
    defaultValue = "PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NiA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMC41IiB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHJ4PSIyNy41IiBmaWxsPSIjNDMzQTRBIi8+CjxtYXNrIGlkPSJtYXNrMF8xMTMzXzk1NDAiIHN0eWxlPSJtYXNrLXR5cGU6YWxwaGEiIG1hc2tVbml0cz0idXNlclNwYWNlT25Vc2UiIHg9IjAiIHk9IjAiIHdpZHRoPSI1NiIgaGVpZ2h0PSI1NSI+CjxyZWN0IHg9IjAuNSIgd2lkdGg9IjU1IiBoZWlnaHQ9IjU1IiByeD0iMjcuNSIgZmlsbD0iIzQzM0E0QSIvPgo8L21hc2s+CjxnIG1hc2s9InVybCgjbWFzazBfMTEzM185NTQwKSI+CjxyZWN0IHg9IjAuNDE2NTA0IiB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHJ4PSIyNy41IiBmaWxsPSIjMjUxRjI4Ii8+CjxyZWN0IHg9Ii0xMS41IiB5PSIzNS4wODM1IiB3aWR0aD0iNzguODMzMyIgaGVpZ2h0PSI3OC44MzMzIiByeD0iMzkuNDE2NyIgZmlsbD0iI0ExNzlGRiIvPgo8cmVjdCB4PSIxNC4xNjY1IiB5PSI5LjQxNjUiIHdpZHRoPSIyNy41IiBoZWlnaHQ9IjI3LjUiIHJ4PSIxMy43NSIgZmlsbD0iI0ExNzlGRiIvPgo8L2c+Cjwvc3ZnPgo=";

    @state()
    value!: string | undefined;

    @query('span.required')
    _errorDOM!: any;
    @query('#avatar-file-picker')
    _avatarFilePicker!: any;

    reportValidity() {
        const invalid = this.required !== false && !this.value;
        if (invalid) {
          if(!this._errorDOM) return;
          this._errorDOM.textContent = '*';
        }
        return !invalid;
    }

    reset() {
        this.value = this.defaultValue;
    }

    onAvatarUploaded() {
        if (this._avatarFilePicker.files && this._avatarFilePicker.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                    this.value = resizeAndExport(img);
                    this._avatarFilePicker.value = "";
                };
                img.src = e.target?.result as string;
                this.dispatchEvent(new CustomEvent("avatar-selected", {
                    composed: true,
                    bubbles: true,
                    detail: {
                        avatar: img.src,
                    },
                }));
            };
            reader.readAsDataURL(this._avatarFilePicker.files[0]);
        }
    }
    
    renderAvatar() {
        if (this.value)
            return html `
        <div
          @click=${() => {
                this.value = undefined;
            }}
        >
          <sl-tooltip content=${"Clear"} placement="bottom">
            <sl-avatar style="--sl-border-radius-medium: 1rem; --sl-border-radius-circle: ${this.shape == 'circle' ? '100%' : ''}"
              image="${this.value}"
              alt="Avatar"
              .shape=${this.shape}
              initials=""
            ></sl-avatar
          ></sl-tooltip>
        </div>
      `;
        else
            return html `
        <nh-button
          .disabled=${this.disabled}
          variant="icon"
          size="icon-label"
          .iconImageB64=${this.defaultValue}
          @click=${() => this._avatarFilePicker.click()}
        >
        </nh-button>`;
    }
    render() {
        return html `<input
        type="file"
        name="avatar"
        id="avatar-file-picker"
        style="display: none"
        @change=${this.onAvatarUploaded}
      />
      <div class="container">
        <label class="error" for="avatar" name="avatar">${this.label}${this.required !== false ? html`<span class='required'></span>` : ""}</label>
        ${this.renderAvatar()}
      </div>`;
    }

  static get elementDefinitions() {
    return {
      'sl-tooltip': SlTooltip,
      'sl-avatar': SlAvatar,
      'nh-button': NHButton,
    };
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      div.container {
        display: flex;
        justify-content: center;
        align-items: center;
      }

      label {
        display: flex;
        padding: 0 8px;
        flex: 1;
        flex-grow: 0;
        flex-basis: 8px;
        color: var(--nh-theme-fg-default); 
        font-family: var(--nh-font-families-body); 
      }
      label span.required {
        color: var(--nh-theme-error-default); 
      }
    `
  ]

};

function resizeAndExport(img: any) {
  const MAX_WIDTH = 300;
  const MAX_HEIGHT = 300;
  let width = img.width;
  let height = img.height;
  // Change the resizing logic
  if (width > height) {
      if (width > MAX_WIDTH) {
          height = height * (MAX_WIDTH / width);
          width = MAX_WIDTH;
      }
  }
  else {
      if (height > MAX_HEIGHT) {
          width = width * (MAX_HEIGHT / height);
          height = MAX_HEIGHT;
      }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx!.drawImage(img, 0, 0, width, height);
  // return the .toDataURL of the temp canvas
  return canvas.toDataURL();
}