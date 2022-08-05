import { EntryHash } from "@holochain/client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";




export class AppletClassHome extends ScopedElementsMixin(LitElement) {

  @property()
  appletClassId!: EntryHash; // devHub hApp release hash

  render() {
    return html`
      You found the sweet spot.
    `
  }

}