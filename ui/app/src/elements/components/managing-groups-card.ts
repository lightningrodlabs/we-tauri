import { NHCard, NHComponentShoelace } from '@neighbourhoods/design-system-components';
import { html, css } from 'lit';

export class ManagingGroupsCard extends NHComponentShoelace {
  render() {
    return html`
      <nh-card .heading=${"Managing Neighbourhoods"} .textSize=${"md"}>
        <ul>
          <li>
            To create a <b>new neighbourhood</b>, click on the "Add Neighbourhood"
            <mwc-icon style="position: relative; top: 0.25em;">group_add</mwc-icon> button in the
            left sidebar.
          </li>
          <li>You will be prompted to <b>create a profile</b> for this neighbourhood.</li>
          <li>
            <b>Invite other members</b> to the neighbourhood from the home screen of your new
            neighbourhood (<mwc-icon style="position: relative; top: 0.25em;">home</mwc-icon>). You
            will need to ask them for their public key (copiable from the identicon in the bottom
            left corner of the screen).
          </li>
          <li><b>Install applets</b> from the DevHub that you want to use as a neighbourhood.</li>
        </ul>
      </nh-card>
    `;
  }

  static get elementDefinitions() {
    return {
      'nh-card': NHCard,
    };
  }

  static get styles() {
    return css`
      :host {
        flex-basis: 50%;
      }
      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        line-height: var(--nh-line-heights-body-relaxed);
      }
      li {
        margin-bottom: calc(1px * var(--nh-spacing-xl));
      }
    `;
  }
}
