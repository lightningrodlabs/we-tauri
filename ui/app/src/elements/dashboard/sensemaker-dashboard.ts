import { LitElement, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import { Assessment } from '@neighbourhoods/sensemaker-lite-types';
import { encodeHashToBase64 } from '@holochain/client';


export class SensemakerDashboard extends ScopedElementsMixin(LitElement) {
  @property()
  allAssessments!: Array<Assessment>;

  async firstUpdated() {
  }

  render() {
    let assessmentTable = html`
    ${this.allAssessments.map((assessment) => html`
        <tr>
            <td>${JSON.stringify(assessment.value)}</td>
            <td>${encodeHashToBase64(assessment.dimension_eh)}</td>
            <td>${encodeHashToBase64(assessment.subject_eh)}</td>
            <td>${encodeHashToBase64(assessment.author)}</td>
        </tr>
    `)}
    `
    return html`
      <main>
        <div class="home-page">
            <table>
                <tr>
                    <th>Value</th>
                    <th>Dimension</th>
                    <th>Resource</th>
                    <th>Author</th>
                </tr>
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
    table {
        font-family: arial, sans-serif;
        border-collapse: collapse;
        width: 100%;
    }
    
    td, th {
        border: 1px solid #dddddd;
        text-align: left;
        padding: 8px;
    }
    
    tr:nth-child(even) {
        background-color: #dddddd;
    }
  `;
}
