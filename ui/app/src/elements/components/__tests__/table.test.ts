const { JSDOM } = require('jsdom');
import { fixture, html } from '@open-wc/testing';
import { describe, expect, test, beforeAll, beforeEach } from 'vitest'
import { expect as expectDomOf } from '@esm-bundle/chai'
// import { getDiffableHTML  } from '@open-wc/semantic-dom-diff';

import '../table';
import './test-harness';
import { mockAssessments, mockStore } from './test-harness';
import { get } from '@holochain-open-dev/stores';
import { tableId } from '../table';
/**
* @vitest-environment jsdom
*/

export const stateful = async (component) => fixture(html`
    <test-harness>${component}</test-harness>
`)

describe('Table', () => {
  let component, harness, toBeTestedComponent, toBeTestedWC;
  let mockWritable;

  beforeAll(async () => {
    component = html`<assessments-table></assessments-table>`;
    harness = await stateful(component);
    
    toBeTestedComponent = harness.querySelector('assessments-table');
    await toBeTestedComponent.updateComplete;
    // toBeTestedWC = toBeTestedComponent.renderRoot.querySelector("adaburrows-table");
  });
  
  beforeEach(async () => {
    mockWritable = mockStore.resourceAssessments();
    mockWritable.mockSetSubscribeValue(mockAssessments);
    toBeTestedWC = toBeTestedComponent.renderRoot.querySelector("#" + tableId);
  });

  test(`Given a SensemakerStore with one resource and two assessments 
    Then state is initialized`, async () => {
      expect(mockStore.resourceAssessments).toHaveBeenCalled();

      expect((get(mockWritable.store()) as any)['abc'].length).toEqual(2);
      
      expect(toBeTestedComponent.tableStore).toBeDefined();
      expect(toBeTestedComponent.tableStore.records.length).toEqual(2);
  });

  test('And it renders a table with two rows', async () => {
    const dom = new JSDOM(toBeTestedWC.innerHTML);
    const elements = dom.window.document.querySelectorAll(`.table-row`);
    expect(elements.length).toBe(2);
  });
    
  test(`Given a SensemakerStore with one resource and two assessments 
    Then state can be mutated by adding an assessment`, async () => {
      expect((get(mockWritable.store()) as any)['abc'].length).toEqual(2);
      const addedAssessment = {
        value: { Integer: 5 },
        dimension_eh: new Uint8Array([4, 3, 3]),
        resource_eh: new Uint8Array([4, 5, 6]),
        resource_def_eh: new Uint8Array([4, 5, 6]),
        author: new Uint8Array([21, 12, 11]),
        maybe_input_dataset: null,
        timestamp: 2343465
      }

      let mutatedAssessments = {'abc' : [...mockAssessments['abc'], addedAssessment]};
      mockWritable.mockSetSubscribeValue(mutatedAssessments);

      expect((get(mockWritable.store()) as any)['abc'].length).toEqual(3);
  });
  // test('And it renders a table with three rows', async () => {
  //     const dom = new JSDOM(toBeTestedWC.innerHTML);
  //     const elements = dom.window.document.querySelectorAll(`.table-row`);
  //     expect(elements.length).toBe(3);
  // });

  // test(`Given a SensemakerStore with one resource and two assessments 
  //   Then state can be mutated by removing an assessment`, async () => {
  //     expect((get(mockWritable.store()) as any)['abc'].length).toEqual(2);

  //     let mutatedAssessments = {'abc': mockAssessments['abc'].slice(1)};

  //     mockWritable.mockSetSubscribeValue(mutatedAssessments);
  //     expect((get(mockWritable.store()) as any)['abc'].length).toEqual(1);
  // });

  // test('And it renders a table with one row', async () => {
  //     expectDomOf(toBeTestedWC).lightDom.to.equal("<div></div>");
  // });
    
});