import { EntryHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement } from "lit";
import { property } from "lit/decorators";
import { matrixContext } from "../context";
import { MatrixStore } from "../matrix-store";








export class WeGroupHome extends ScopedElementsMixin(LitElement) {

  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @property()
  weGroupId!: EntryHash;

}