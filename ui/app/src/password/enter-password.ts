import { DisplayError } from "@holochain-open-dev/elements";
import { localized, msg } from "@lit/localize";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import {
  Card,
  MdFilledButton,
  MdOutlinedTextField,
} from "@scoped-elements/material-web";
import { html, LitElement } from "lit";
import { query, state } from "lit/decorators.js";
import { weStyles } from "../shared-styles.js";
import { enterPassword } from "../tauri.js";

@localized()
export class EnterPassword extends ScopedElementsMixin(LitElement) {
  @state()
  password: string = "";

  async enterPassword() {
    try {
      await enterPassword(this.password);
      this.dispatchEvent(
        new CustomEvent("password-entered", {
          bubbles: true,
          composed: true,
        })
      );
    } catch (e) {
      console.log(JSON.stringify(e));
    }
  }

  render() {
    return html` <mwc-card>
      <div class="column">
        <span>${msg("Enter Password")}</span>
        <md-outlined-text-field
          id="password-field"
          type="password"
          @input=${(e) => (this.password = e.target.value)}
        ></md-outlined-text-field>
        <md-filled-button
          .label=${msg("Enter Password")}
          .disabled=${this.password === ""}
          @click=${() => this.enterPassword()}
        ></md-filled-button></div
    ></mwc-card>`;
  }

  static get scopedElements() {
    return {
      "md-outlined-text-field": MdOutlinedTextField,
      "md-filled-button": MdFilledButton,
      "mwc-card": Card,
    };
  }

  static styles = weStyles;
}
