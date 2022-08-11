import { EntryHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { Task } from "@lit-labs/task";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { CircularProgress } from "@scoped-elements/material-web";
import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { matrixContext } from "../context";
import { MatrixStore } from "../matrix-store";
import { sharedStyles } from "../sharedStyles";
import { RenderBlock } from "./render-block";

const sleep = (ms: number) => new Promise((r) => setTimeout(() => r(null), ms));

export class AppletClassRenderer extends ScopedElementsMixin(LitElement) {

  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @property()
  appletClassId!: EntryHash;

  _rendererTask = new Task(
    this,
    async () => {
      await sleep(1);
      return this._matrixStore.fetchAppletClassRenderers(this.appletClassId);
    },
    () => [this._matrixStore, this.appletClassId]
  );


  render() {
    return this._rendererTask.render({
      pending: () => html`
        <div class="center-content">
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>
      `,
      complete: (renderer) =>
        html`
          <render-block
            .renderer=${renderer.blocks.find(
              (renderBlock) => renderBlock.name === "merge-eye-view"
              )?.render
            }
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