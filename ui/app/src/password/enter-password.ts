import { localized, msg } from "@lit/localize";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { weStyles } from "../shared-styles.js";
import { enterPassword } from "../tauri.js";

import "@holochain-open-dev/elements/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import { notifyError, onSubmit } from "@holochain-open-dev/elements";

@localized()
@customElement("enter-password")
export class EnterPassword extends LitElement {
  async enterPassword(password: string) {
    try {
      await enterPassword(password);
      this.dispatchEvent(
        new CustomEvent("password-entered", {
          bubbles: true,
          composed: true,
        })
      );
    } catch (e) {
      notifyError(msg("Invalid password"));
      console.log(JSON.stringify(e));
    }
  }

  render() {
    return html` <sl-card>
      <span slot="header">${msg("Enter Password")}</span>
      <form class="column" ${onSubmit((f) => this.enterPassword(f.password))}>
        <sl-input
          id="password-field"
          type="password"
          required
          name="password"
          style="margin-bottom: 16px"
        ></sl-input>
        <sl-button type="submit" variant="primary">
          ${msg("Enter Password")}
        </sl-button>
      </form></sl-card
    >`;
  }

  static styles = weStyles;
}
