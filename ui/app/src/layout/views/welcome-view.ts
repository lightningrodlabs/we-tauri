import { html, LitElement, css } from "lit";
import { customElement } from "lit/decorators.js";
import { localized, msg } from "@lit/localize";

import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";

import { wrapPathInSvg } from "@holochain-open-dev/elements";
import { mdiAccountMultiplePlus } from "@mdi/js";

import { weStyles } from "../../shared-styles.js";

@localized()
@customElement("welcome-view")
export class WelcomeView extends LitElement {
  renderExplanationCard() {
    return html`
      <sl-card style="flex: 1">
        <span class="title" slot="header">${msg("What is We?")}</span>
        <div class="column" style="text-align: left; font-size: 1.15em;">
          <span>${msg("We is a group collaboration OS.")}</span>
          <br />
          <span
            >${msg(
              "In We, first you create a group, and then you install applets to that group."
            )}</span
          >
          <br />
          <span
            >${msg(
              "You can see all the groups you are part of in the left sidebar."
            )}</span
          >
          <br />
          <span
            >${msg(
              "You can also see all the applets that you have installed in the top sidebar, if you have any."
            )}</span
          >
          <br />
          <span
            >${msg(
              "WARNING! We is in alpha version, which means that is not ready for production use yet. Expect bugs, breaking changes, and to lose all the data for all groups when you upgrade to a new version of We."
            )}</span
          >
        </div>
      </sl-card>
    `;
  }

  renderManagingGroupsCard() {
    return html`
      <sl-card style="flex: 1; margin-left: 16px">
        <span class="title" slot="header">${msg("Managing Groups")}</span>
        <div style="text-align: left; font-size: 1.15em;">
          <ol style="line-height: 180%; margin: 0;">
            <li>
              ${msg('To create a new group, click on the "Add Group"')}
              <sl-icon
                style="position: relative; top: 0.25em;"
                .src=${wrapPathInSvg(mdiAccountMultiplePlus)}
              ></sl-icon>
              ${msg("button in the left sidebar.")}
            </li>
            <li>
              ${msg(
                "After creating a group, create a profile for this group. Only the members of that group are going to be able to see your profile."
              )}
            </li>
            <li>
              ${msg(
                "Invite other members to the group by sharing the group link with them."
              )}
            </li>
            <li>${msg("Install applets that you want to use as a group.")}</li>
          </ol>
        </div>
      </sl-card>
    `;
  }

  render() {
    return html`
      <div class="column" style="align-items: center; flex: 1; overflow: scroll; padding: 24px;">
        <sl-button
          variant="primary"
          style="position: absolute; top: 20px; right: 20px;"
          @click=${(e) => this.dispatchEvent(new CustomEvent("request-join-group",
          {
            composed: true,
            bubbles: true
          }))}
        >${msg("Join Group with Invite Link")}</sl-button>
        <div
          class="row center-content default-font"
          style="font-size: 3em; color: #2c3888; margin-top: 15px;"
        >
          <div>${msg("Welcome to We!")}</div>
        </div>

        <div class="row" style="margin-top: 48px; max-width: 1200px">
          ${this.renderExplanationCard()} ${this.renderManagingGroupsCard()}
        </div>
      </div>
    `;
  }

  static styles = [
    css`
      :host {
        display: flex;
        flex: 1;
      }
    `,
    weStyles,
  ];
}
