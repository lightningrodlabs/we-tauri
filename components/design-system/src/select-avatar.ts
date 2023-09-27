import { CSSResult, css, html } from "lit";
import { property, query, state } from "lit/decorators.js";
import { b64images } from "@neighbourhoods/design-system-styles";
import { NHComponent } from "./ancestors/base.js";
import { SlAvatar, SlButton } from "@shoelace-style/shoelace";
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
    @property()
    defaultValue = "Avatar";

    @state()
    value!: string | undefined;

    @query('#avatar-file-picker')
    _avatarFilePicker!: any;

    reportValidity() {
        // const invalid = this.required !== false && !this.value;
        // if (invalid) {
        //     this._errorInput.setCustomValidity("Avatar is required");
        //     this._errorInput.reportValidity();
        // }
        // return !invalid;
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
          class="column"
          style="align-items: center; height: 50px"
          @click=${() => {
                this.value = undefined;
            }}
        >
          <sl-tooltip .content=${"Clear"}>
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
            return html ` <div class="column" style="align-items: center;">
        <nh-button
          .disabled=${this.disabled}
          variant="icon"
          size="icon-lg"
          .iconImageB64=${"PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NiA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMC41IiB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHJ4PSIyNy41IiBmaWxsPSIjNDMzQTRBIi8+CjxtYXNrIGlkPSJtYXNrMF8xMTMzXzk1NDAiIHN0eWxlPSJtYXNrLXR5cGU6YWxwaGEiIG1hc2tVbml0cz0idXNlclNwYWNlT25Vc2UiIHg9IjAiIHk9IjAiIHdpZHRoPSI1NiIgaGVpZ2h0PSI1NSI+CjxyZWN0IHg9IjAuNSIgd2lkdGg9IjU1IiBoZWlnaHQ9IjU1IiByeD0iMjcuNSIgZmlsbD0iIzQzM0E0QSIvPgo8L21hc2s+CjxnIG1hc2s9InVybCgjbWFzazBfMTEzM185NTQwKSI+CjxyZWN0IHg9IjAuNDE2NTA0IiB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHJ4PSIyNy41IiBmaWxsPSIjMjUxRjI4Ii8+CjxyZWN0IHg9Ii0xMS41IiB5PSIzNS4wODM1IiB3aWR0aD0iNzguODMzMyIgaGVpZ2h0PSI3OC44MzMzIiByeD0iMzkuNDE2NyIgZmlsbD0iI0ExNzlGRiIvPgo8cmVjdCB4PSIxNC4xNjY1IiB5PSI5LjQxNjUiIHdpZHRoPSIyNy41IiBoZWlnaHQ9IjI3LjUiIHJ4PSIxMy43NSIgZmlsbD0iI0ExNzlGRiIvPgo8L2c+Cjwvc3ZnPgo="}
          @click=${() => this._avatarFilePicker.click()}
        >
        </nh-button>
      </div>`;
    }
    render() {
        return html `<input
        type="file"
        id="avatar-file-picker"
        style="display: none"
        @change=${this.onAvatarUploaded}
      />
      <div class="column" style="position: relative; align-items: center">
        ${this.label !== ""
            ? html `
              <span
                style="font-size: var(--sl-input-label-font-size-medium); margin-bottom: 4px"
                >${this.label}${this.required !== false ? " *" : ""}</span
              >
            `
            : html ``}
        ${this.renderAvatar()}
      </div>`;
    }

  static get elementDefinitions() {
    return {
      'sl-avatar': SlAvatar,
      'nh-button': NHButton,
    };
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      .row {
        display: flex;
        flex-direction: row;
      }
      .column {
        display: flex;
        flex-direction: column;
      }
      .small-margin {
        margin-top: 6px;
      }
      .big-margin {
        margin-top: 23px;
      }

      .fill {
        flex: 1;
        height: 100%;
      }

      .title {
        font-size: 20px;
      }

      .center-content {
        align-items: center;
        justify-content: center;
      }

      .placeholder {
        color: var(--sl-color-gray-700);
      }

      .flex-scrollable-parent {
        position: relative;
        display: flex;
        flex: 1;
      }

      .flex-scrollable-container {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
      }

      .flex-scrollable-x {
        max-width: 100%;
        overflow-x: auto;
      }
      .flex-scrollable-y {
        max-height: 100%;
        overflow-y: auto;
      }
      :host {
        color: var(--sl-color-neutral-1000);
      }

      sl-card {
        display: flex;
      }
      sl-card::part(base) {
        flex: 1;
      }
      sl-card::part(body) {
        display: flex;
        flex: 1;
      }
      sl-drawer::part(body) {
        display: flex;
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