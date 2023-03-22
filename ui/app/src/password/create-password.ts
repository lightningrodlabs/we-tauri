import { localized, msg } from "@lit/localize";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { weStyles } from "../shared-styles.js";
import { createPassword } from "../tauri.js";

import "@holochain-open-dev/elements/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import { notifyError, onSubmit } from "@holochain-open-dev/elements";

@localized()
@customElement("create-password")
export class CreatePassword extends LitElement {
  async createPassword(password: string) {
    try {
      await createPassword(password);
      this.dispatchEvent(
        new CustomEvent("password-created", {
          bubbles: true,
          composed: true,
        })
      );
    } catch (e) {
      notifyError(msg("Error initializing holochain"));
      console.log(JSON.stringify(e));
    }
  }

  render() {
    return html` <sl-card>
      <span slot="header">${msg("Enter Password")}</span>
      <form class="column" ${onSubmit((f) => this.createPassword(f.password))}>
        <sl-input
          id="password-field"
          type="password"
          required
          name="password"
        ></sl-input>
        <sl-button type="submit" variant="primary">
          ${msg("Create Password")}
        </sl-button>
      </form></sl-card
    >`;
  }

  static styles = weStyles;
}
