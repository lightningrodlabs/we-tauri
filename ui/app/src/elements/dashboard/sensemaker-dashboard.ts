import { LitElement, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';

import { Assessment } from '@neighbourhoods/sensemaker-lite-types';


export class SensemakerDashboard extends ScopedElementsMixin(LitElement) {
  @property()
  allAssessments!: Array<Assessment>;

  async firstUpdated() {
  }

  render() {
    let assessmentTable = html`
    ${this.allAssessments.map((assessment) => html`
        <tr>${JSON.stringify(assessment)}</tr>
    `)}
    `
    return html`
      <main>
        <div class="home-page">
            <table>
                ${assessmentTable}
            </table>
        </div>
      </main>
    `;
  }


  static get scopedElements() {
    return {
    };
  }

  static styles = css`
    .home-page {
      display: flex;
      flex-direction: row;
    }  

    :host {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      font-size: calc(10px + 2vmin);
      color: #1a2b42;
      max-width: 960px;
      margin: 0 auto;
      text-align: center;
      background-color: var(--lit-element-background-color);
    }

    main {
      flex-grow: 1;
    }

    .app-footer {
      font-size: calc(12px + 0.5vmin);
      align-items: center;
    }

    .app-footer a {
      margin-left: 5px;
    }
  `;
}
