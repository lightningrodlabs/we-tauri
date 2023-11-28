import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

import { hashProperty } from "@holochain-open-dev/elements";
import { HoloHash } from "@holochain/client";
import "@holochain-open-dev/elements/dist/elements/holo-identicon.js";

export class HoloIdenticon extends LitElement {
  @property(hashProperty("hash"))
  hash!: HoloHash;

  render() {
    return html`<holo-identicon hash=${this.hash}>`;
  }
}
