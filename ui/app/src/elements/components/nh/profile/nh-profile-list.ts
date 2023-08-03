import { css, CSSResult, html } from "lit";
import { customElement } from "lit/decorators.js";
import { NHComponent } from '@neighbourhoods/design-system-components';
import "@holochain-open-dev/profiles/dist/elements/list-profiles";

@customElement("nh-profile-list")
export class NHProfileList extends NHComponent {
  render() {
    return html`
      <span>
        profile list
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