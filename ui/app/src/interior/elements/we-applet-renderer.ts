import { css, html, LitElement } from "lit";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { ListProfiles } from "@holochain-open-dev/profiles";
import {
  Button,
  TextField,
  Snackbar,
  CircularProgress,
} from "@scoped-elements/material-web";
import { contextProvided } from "@lit-labs/context";
import { AgentPubKeyB64, EntryHashB64 } from "@holochain-open-dev/core-types";
import { query, state, property } from "lit/decorators.js";

import { sharedStyles } from "../../sharedStyles";
import { WeStore } from "../we-store";
import { weContext } from "../context";
import { RenderBlock } from "./render-block";
import { Renderer } from "@lightningrodlabs/we-applet";
import { Task } from "@lit-labs/task";

const sleep = (ms: number) => new Promise((r) => setTimeout(() => r(null), ms));

export class WeAppletRenderer extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: weContext, subscribe: true })
  @state()
  _store!: WeStore;

  @state()
  _pubKey: AgentPubKeyB64 | undefined;

  @property()
  appletHash!: EntryHashB64;

  _rendererTask = new Task(
    this,
    async () => {
      await sleep(1);
      return this._store.fetchAppletRenderers(this.appletHash);
    },
    () => [this._store, this.appletHash]
  );

  render() {
    console.log(this._rendererTask.status);
    return this._rendererTask.render({
      pending: () => html`
        <div class="center-content">
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>
      `,
      complete: (renderer) =>
        html`
          <render-block
            .renderer=${renderer.full}
            style="flex: 1"
          ></render-block>
        `,
    });
  }

  static get scopedElements() {
    return {
      "render-block": RenderBlock,
      "mwc-circular-progress": CircularProgress,
    };
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        position: relative;
      }
    `,
  ];
}
