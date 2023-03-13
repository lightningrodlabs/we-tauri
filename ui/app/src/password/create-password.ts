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
import { createPassword } from "../tauri.js";

@localized()
export class CreatePassword extends ScopedElementsMixin(LitElement) {
  @state()
  password: string = "";

  async createPassword() {
    await createPassword(this.password);
    this.dispatchEvent(
      new CustomEvent("password-created", {
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html` <mwc-card>
      <div class="column">
        <span>${msg("Create Password")}</span>
        <md-outlined-text-field
          id="password-field"
          type="password"
          @input=${(e) => (this.password = e.target.value)}
        ></md-outlined-text-field>
        <md-filled-button
          .label=${msg("Create Password")}
          .disabled=${this.password === ""}
          @click=${() => this.createPassword()}
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
