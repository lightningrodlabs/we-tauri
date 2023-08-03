import { css, CSSResult, html } from "lit";
import { customElement } from "lit/decorators.js";
import { NHComponent } from '@neighbourhoods/design-system-components';
import "@holochain-open-dev/profiles/dist/elements/my-profile.js";

@customElement("nh-my-profile")
export class NHProfile extends NHComponent {
  render() {
    return html`
      <span>
        my-profile
      </span>
    `;
  }

  static styles : CSSResult[] = [
      super.styles as CSSResult,
      css`
        :host {
          line-height: 27px;
        }
      `
    ];
}