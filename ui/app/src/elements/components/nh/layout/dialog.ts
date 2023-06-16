import { css, CSSResult, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { NHComponentShoelace } from 'neighbourhoods-design-system-components';
import { SlDialog, SlAlert, SlButtonGroup, SlButton } from '@scoped-elements/shoelace';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';

type DialogType = 'create-neighbourhood' | 'widget-config' | 'confirmation' | 'applet-install'| 'applet-uninstall';
type AlertType = 'danger' | 'warning' | 'neutral' | 'success' | 'primary';

@customElement('nh-dialog')
export class NHDialog extends ScopedElementsMixin(NHComponentShoelace) {
  @property()
  title!: string;

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
  alertMessage: string | null = null;

  @property()
  alertType: AlertType = 'neutral';

  @property({ attribute: true })
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

  renderActions() {
    switch (this.dialogType) {
      case 'create-neighbourhood':
        return html`<sl-button-group id="buttons">
          <sl-button
            id="secondary-action-button"
            size="large"
            variant="neutral"
            @click=${this.hideDialog}
          >
            Cancel
          </sl-button>
          <sl-button
            id="primary-action-button"
            size="large"
            variant="primary"
            @click=${this.onOkClicked}
            ?disabled=${this.primaryButtonDisabled}
          >
            Save
          </sl-button>
        </sl-button-group>`;
      default:
        return html``;
    }
  }

  render() {
    return html`
      ${this.alertMessage
        ? html`<sl-alert variant="${this.alertType}">${this.alertMessage}</sl-alert>`
        : null}
      <sl-dialog
        id="main"
        ?open=${this.isOpen}
        label="${this.title}"
        @sl-after-hide=${this.onDialogClosed}
      >
        <slot name="content"></slot>
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

  onOkClicked = () => {
    if (this.handleOk) {
      this.handleOk();
    }
    this.hideDialog();
  };

  static get scopedElements() {
    return {
      'sl-dialog': SlDialog,
      'sl-alert': SlAlert,
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
