import { classMap } from 'lit/directives/class-map.js';
import { CSSResult, css, html } from "lit"
import { property, state } from "lit/decorators.js";
import { b64images } from "@neighbourhoods/design-system-styles";
import { NHAlert, NHComponent, NHTooltip } from '..';
import NHAssessmentContainer from './assessment-container';
import { AssessmentWidgetBlockConfig, AssessmentWidgetConfig } from '@neighbourhoods/client';
import { SlSpinner } from '@shoelace-style/shoelace';

export default class NHResourceAssessmentTray extends NHComponent {
  @property()
  assessmentWidgetTrayConfig: Array<AssessmentWidgetBlockConfig> = []; // Still used for storybook currently
  
  @property()
  editable: boolean = false;
  
  @state()
  editing: boolean = true;
  @state()
  expanded: boolean = false;

  toggleExpanded() {
    this.expanded = !this.expanded
  }

  tooltipMessage() {
    if(this.editing) return "Add as many widgets as you need - the changes won't be saved until the Update Config button is pressed"

    return "To add a widget, click the plus icon."
  }

  render() {
    return html`
      <nh-tooltip .type=${this.editing ? "warning" : "success"} .text=${this.tooltipMessage()}>
        <div
          slot="hoverable"
          class="assessment-widget-tray${classMap({
            editable: !!this.editable,
          })}"
          data-expanded=${this.expanded}
        >
        <slot name="widgets"></slot>

        <div name="add-widget-icon" class="add-widget-icon" @click=${() => {
          this.dispatchEvent(
            new CustomEvent("add-widget", {
              bubbles: true,
              composed: true,
            })
          );
        }}>
          ${ // Add spacers to the add-widget-icon div to position the button
          this.editable ? this.assessmentWidgetTrayConfig.map((_widget) => html`
              <assessment-container
                .assessmentValue=${0}
                .iconImg=${""}
              ></assessment-container>
          `)
          : null
          }
          ${ 
          this.editing
          ? html`<sl-spinner class="icon-spinner"></sl-spinner>`
          : null
          }
          ${ 
          this.editable && !this.editing
            ? html`<img class="add-assessment-icon" src=${`data:image/svg+xml;base64,${b64images.icons.plus}`} alt=${"Add a widget"} />`
            : null
          }
        </div>
        <nav class="assessment-widget-menu" @click=${() => {this.toggleExpanded(); this.requestUpdate()}}>
          <div class="menu-dot"></div>
          <div class="menu-dot"></div>
          <div class="menu-dot"></div>
        </nav>
      </nh-tooltip>
    `
  }

  static elementDefinitions = {
    'assessment-container': NHAssessmentContainer,
    'nh-tooltip': NHTooltip,
    'sl-spinner': SlSpinner,
  }

  static styles = [
    super.styles as CSSResult,
    css`
      slot[name="widgets"], span.widget-config-icons {
        background: var(--nh-theme-bg-detail);
        overflow-x: auto;
        max-height: 48px;
        display: flex;
        padding-right: 4px;
      }

      slot[name="widgets"] {
        min-width: 56px;
        min-height: 48px;
      }

      .assessment-widget-tray {
        border-radius: calc(1px * var(--nh-radii-md));
      }

      span.widget-config-icons {
        padding-left: 6px;
        padding-right: 6px;
        gap: 8px
      }

      *::slotted(div), span.widget-config-icons, slot[name="widgets"] {
        border-radius: calc(1px * var(--nh-radii-md) - 5px);
      }
      
      *::slotted(div) {
        display: flex;
      }

      .assessment-widget-menu {
        margin: auto 4px;
        cursor: pointer;
      }
      
      .assessment-widget-tray {
        background-color: var(--nh-theme-bg-surface);
        padding: 4px;
        border: 1px solid var(--nh-theme-accent-default);
        display: flex;
        width: min-content;
        max-width: 100%;
        max-height: 48px;
        overflow: hidden;
      }

      .editable {
        position: relative;
      }

      .editable .add-assessment-icon {
        height: 24px;
        width: 24px;
        margin: 4px 6px;
        padding: 6px;
        border-radius: calc(1px * var(--nh-radii-xl));
        background-color: var(--nh-theme-accent-default);
      }

      .editable .add-assessment-icon:hover {
        background-color: var(--nh-theme-accent-emphasis);
        cursor: pointer;
      }

      .editable .add-widget-icon {
        visibility: visible;
        opacity: 1;
        height: 48px;
        padding-left: 6px;
        padding-right: 6px;
        gap: 8px;
      }

      .editable .icon-spinner {
        font-size: 2.1rem;
        --speed: 10000ms;
        --track-width: 4px;
        --indicator-color: var(--nh-theme-accent-emphasis);
        margin: 3px
      }

      .add-widget-icon {
        display: flex;
        align-items: center;
        visibility: hidden;
        opacity: 0;
      }

      .menu-dot {
        width: 5px;
        height: 5px;
        margin: 4px;
        border-radius: var(--border-r-tiny);
        background-color: var(--nh-theme-accent-default);
      }
    `,
  ];
}