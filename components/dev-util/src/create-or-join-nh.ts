import { query } from "lit/decorators.js"
import { html, css } from "lit"
import { NHComponent, NHButton } from '@neighbourhoods/design-system-components'

export default class CreateOrJoinNh extends NHComponent
{
    static elementDefinitions = {
        'nh-button': NHButton,
    }

    static styles = css`
        .nh-creation-container {
            display: flex;
            flex-direction: column;
            text-align: center;
            color: var(--nh-theme-info-subtle);
        }
        .nh-creation-container input {
          /* :TODO: turn into Design System component */
          width: 15em;
        }
    `

    @query('#ca-pubkey')
    input!: HTMLInputElement;

    render() {
        return html`
            <div class="nh-creation-container">
                <nh-button clickHandler=${this.dispatchCreateNeighbourhood} label="Create Neighbourhood"></nh-button>
                <p>&mdash; or &mdash;</p>
                <div>
                    <input id="ca-pubkey" placeholder=${`community activator pubkey`} />
                    <nh-button clickHandler=${this.dispatchJoinNeighbourhood} label="Join Neighbourhood"></nh-button>
                </div>
            </div>
        `
    }

    dispatchCreateNeighbourhood() {
        this.dispatchEvent(new CustomEvent('create-nh'))
    }

    dispatchJoinNeighbourhood() {
        const newValue = this.input.value;
        if (newValue) {
            const options = {
                detail: {newValue},
                bubbles: true,
                composed: true
            };
            console.log('ca key', newValue)
            this.dispatchEvent(new CustomEvent('join-nh', options))
            this.input.value = ''
        }
    }
}
