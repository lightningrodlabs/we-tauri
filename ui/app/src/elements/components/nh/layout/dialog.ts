import { css, CSSResult, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { NHComponentShoelace } from 'neighbourhoods-design-system-components';
import { SlDialog, SlAlert, SlButtonGroup, SlButton } from '@scoped-elements/shoelace';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import { classMap } from "lit/directives/class-map.js";
import { AlertType, NHAlert } from './alert';

enum DialogType {
  createNeighbourhood = 'create-neighbourhood',
  widgetConfig = 'widget-config',
  confirmation = 'confirmation',
  appletInstall = 'applet-install',
  appletUninstall = 'applet-uninstall',
} 

@customElement('nh-dialog')
export class NHDialog extends ScopedElementsMixin(NHComponentShoelace) {
  @property()
  title!: string
  @property()
  size: string = 'small';

  @property()
  dialogType!: DialogType;

  @property()
  handleOk!: () => void;

  @property({ attribute: false })
  onDialogClosed!: () => void;

  @property({ type: Boolean })
  isOpen = false;

  @property({ type: Boolean})
  primaryButtonDisabled = false;

  @property()
  alertMessage?: string;

  @property()
  alertType: AlertType = 'neutral';

  @property()
  openButtonRef!: HTMLElement;

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.openButtonRef?.removeEventListener('click', this.showDialog);
    super.disconnectedCallback();
  }

  updated(changedProperties) {
    if (changedProperties.has('openButtonRef')) {
      if (typeof changedProperties.get('openButtonRef') !== 'undefined') {
        this.openButtonRef?.addEventListener('click', this.showDialog);
      }
    }
  }
    
  chooseButtonText() {
    switch (this.dialogType) {
      case DialogType.createNeighbourhood:
      return {
        primary: 'Save',
        secondary: 'Cancel',
      }
    
      case DialogType.widgetConfig:
      return {
        primary: 'Save',
        secondary: '',
      }

      case DialogType.appletInstall:
      return {
        primary: 'Install',
        secondary: 'Cancel',
      }
    
      default:
        return {
          primary: 'OK',
          secondary: 'Cancel',
        }
    }
  }

  renderActions() {
    switch (true) {
      case ['applet-install', 'create-neighbourhood'].includes(this.dialogType):
        return html`<sl-button-group id="buttons">
          <sl-button
            id="secondary-action-button"
            size="large"
            variant="neutral"
            @click=${this.hideDialog}
          >
            ${this.chooseButtonText().secondary}
          </sl-button>
          <sl-button
            id="primary-action-button"
            size="large"
            variant="primary"
            @click=${this.onOkClicked}
            ?disabled=${this.primaryButtonDisabled}
          >
          ${this.chooseButtonText().primary}
          </sl-button>
        </sl-button-group>`;
      case 'widget-config' === this.dialogType:
        return html`<sl-button-group id="buttons">
          <sl-button
            id="primary-action-button"
            size="large"
            variant="primary"
            @click=${this.onOkClicked}
            ?disabled=${this.primaryButtonDisabled}
          >
          ${this.chooseButtonText().primary}
          </sl-button>
        </sl-button-group>`;

      default:
        return html``;
    }
  }

  render() {
    return html`
      <sl-dialog
        id="main"
        class=${classMap({
          large: this.size == 'large',
          medium: this.size == 'medium',
        })}
        ?open=${this.isOpen}
        label="${this.title}"
        @sl-after-hide=${this.onDialogClosed}
      >
        <div class="container">
          ${this.alertMessage
          ? html`<nh-alert><span>${this.alertMessage}</span></nh-alert>`
          : null}
          <slot name="inner-content">
          </slot>
        </div>
        <div class="actions" slot="footer">${this.renderActions()}</div>
      </sl-dialog>
    `;
  }

  showDialog = () => {
    this.isOpen = true;
  };

  hideDialog = () => {
    this.isOpen = false;
  };

  setPrimaryActionEnabled = (value: boolean) => {
    this.primaryButtonDisabled = !value;
  };

  onOkClicked = () => {
    if (this.handleOk) {
      this.handleOk();
    }
    this.hideDialog();
  };

  static get scopedElements() {
    return {
      'sl-dialog': SlDialog,
      'nh-alert': NHAlert,
      'sl-button-group': SlButtonGroup,
      'sl-button': SlButton,
    };
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      #main::part(base) {
        background-color: var(--nh-theme-bg-surface);
      }
      #main::part(panel) {
        border-radius: calc(1px * var(--nh-radii-xl));
        background-color: var(--nh-theme-bg-surface);
        max-height: 16rem;
        --sl-shadow-x-large: 2px -1px var(--nh-theme-bg-subtle);
      }
      @media (max-height: 767px) {
        .container {
          display: flex;
        }
      }

      #main.medium::part(panel) {
        max-height: 90vh;
        min-width: 50vw;
      }
      #main.large::part(panel) {
        min-height: 90vh;
        min-width: 95vw;
      }
      #main.large::slotted(*) {
        min-height: 80vh;
        overflow-y: auto;
      }
      
      #main.medium::slotted(div) {
        min-height: 90vh;
      }
      #main.large::slotted(div) {
        min-height: 80vh;
      }


      #main::part(overlay),
      #main::part(base) {
        background-color: var(--nh-theme-bg-subtle-50);
        transition: opacity 1s ease-in-out;
      }
      #main::part(body),
      #main::part(footer),
      #main::part(header) {
        overflow: hidden;
        display: flext;
        justify-content: flex-start;
        padding: calc(1px * var(--nh-spacing-md));
        align-items: flex-start;
      }
      #main::part(title),
      #main::part(close-button) {
        text-transform: uppercase;
        font-weight: var(--nh-font-weights-body-bold);
        font-family: var(--nh-font-families-headlines);
        padding: calc(1px * var(--nh-spacing-sm));
        color: var(--nh-theme-fg-muted);
      }
      #main::part(title) {
        font-size: calc(1px * var(--nh-font-size-sm));
        letter-spacing: 0.5px;
      }
      #main::part(close-button):hover {
        color: var(--nh-theme-bg-canvas);
      }
      #main::part(close-button) {
        position: absolute;
        right: 0;
        top: 0;
      }
      ::slotted(div), #buttons {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: padding: calc(1px * var(--nh-spacing-md));
      }
      #buttons {
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
    `,
  ];
}
