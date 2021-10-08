import { deserializeHash, HoloHashB64 } from "@holochain-open-dev/core-types";
import { css, html, LitElement, PropertyValues } from "lit";
import { SlTooltip } from "@scoped-elements/shoelace";
import { property, query } from "lit/decorators.js";
import renderIcon from "@holo-host/identicon";
import { classMap } from "lit/directives/class-map.js";

import { Dictionary } from "../types";

export class WePlayer extends LitElement {
  @property()
  hash!: HoloHashB64;

  @property()
  props!: Dictionary<string>;

  @property()
  size: number | undefined = undefined;

  @property()
  shape: "square" | "circle" = "circle";

  @property()
  me: boolean = false;

  @property()
  showHash: boolean = true;

  @query("#canvas")
  _canvas!: HTMLCanvasElement;

  updated(changedValues: PropertyValues) {
    super.updated(changedValues);

    if (changedValues.has("hash") || changedValues.has("size")) {
      renderIcon(
        {
          hash: deserializeHash(this.hash),
          size: this.size,
        },
        this._canvas
      );
    }
  }

  render() {
    return html`
      <li class="player">
        <sl-tooltip placement="left" .content=${this.hash}>
          <canvas
            id="canvas"
            width="1"
            height="1"
            class=${classMap({
              square: this.shape === "square",
              circle: this.shape === "circle",
            })}
          ></canvas>
        </sl-tooltip>
        ${this.props ? html`<div>${this.props.nickname}</div>` : ""}
      </li>
    `;
  }

  static get scopedElements() {
    return {
      "sl-tooltip": SlTooltip,
    };
  }

  static get styles() {
    return css`
      .square {
        border-radius: 0%;
      }

      .circle {
        border-radius: 50%;
      }
      .player {
        list-style: none;
        display: inline-block;
        margin: 2px;
        text-align: center;
        font-size: 70%;
      }
    `;
  }
}
