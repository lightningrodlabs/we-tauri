import { deserializeHash, HoloHashB64 } from '@holochain-open-dev/core-types';
import { css, html, LitElement, PropertyValues } from 'lit';
import { property, query } from 'lit/decorators.js';
import renderIcon from '@holo-host/identicon';
import { classMap } from 'lit/directives/class-map.js';
export class WePlayer extends LitElement {
  @property()
  hash!: HoloHashB64;

  @property()
  size: number | undefined = undefined;

  @property()
  shape: 'square' | 'circle' = 'circle';

  @property()
  me: boolean = false;

  @property()
  showHash: boolean = true;

  @query('#canvas')
  _canvas!: HTMLCanvasElement;

  updated(changedValues: PropertyValues) {
    super.updated(changedValues);

    if (changedValues.has('hash') || changedValues.has('size')) {
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
      <canvas
        id="canvas"
        width="1"
        height="1"
        class=${classMap({
          square: this.shape === 'square',
          circle: this.shape === 'circle',
        })}
      ></canvas>
${(this.showHash && this.hash) ? html`<div>${this.hash.slice(-4)}</div>` : ''}
</li>
    `;
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
