const { JSDOM } = require('jsdom');
import { fixture, html } from '@open-wc/testing';
import { describe, expect, test, beforeAll, beforeEach } from 'vitest'
import { expect as expectDomOf } from '@esm-bundle/chai'
// import { getDiffableHTML  } from '@open-wc/semantic-dom-diff';

import '../table';
import './test-harness';
import { mockAssessments, mockSensemakerStore } from './test-harness';
import { get } from '@holochain-open-dev/stores';
import { AssessmentDict, tableId } from '../table';
import { render } from 'lit';
/**
* @vitest-environment jsdom
*/

export const mockResourceName = 'abc';

export const stateful = async (component) => fixture(html`
    <test-harness>${component}</test-harness>
`)

describe('Table', () => {
  let component, harness, componentDom, toBeTestedWC;
  let mockStore;

  const initialRender = async (testComponent) => {
    harness = await stateful(component);
    componentDom = harness.querySelector('assessments-table');
    await componentDom.updateComplete;
  }
  const renderAndReturnDom = async (testComponent) => {
    await initialRender(testComponent)
    toBeTestedWC = componentDom.renderRoot.querySelector("#" + tableId);
    return new JSDOM(toBeTestedWC.innerHTML);
  }

  beforeAll(async () => {
    component = html`<assessments-table></assessments-table>`;
    await initialRender(component)
    // toBeTestedWC = componentDom.renderRoot.querySelector("adaburrows-table");
  });
  
  beforeEach(async () => {
    mockStore = mockSensemakerStore.resourceAssessments();
    mockStore.mockSetSubscribeValue(mockAssessments);
    toBeTestedWC = componentDom.renderRoot.querySelector("#" + tableId);
  });

  // test(`Given a SensemakerStore with no resources and no assessments 
  //   Then state is initialized`, async () => {
  //     expect(mockSensemakerStore.resourceAssessments).toHaveBeenCalled();

  //     expect(mockStore.value[mockResourceName].length).toEqual(0);
      
  //     expect(componentDom.tableStore).toBeDefined();
  //     expect(componentDom.tableStore.records.length).toEqual(0);
  // });

  test(`Given a SensemakerStore with one resource and two assessments 
    Then state is initialized`, async () => {
      expect(mockSensemakerStore.resourceAssessments).toHaveBeenCalled();

      expect(mockStore.value[mockResourceName].length).toEqual(2);
      
      expect(componentDom.tableStore).toBeDefined();
      expect(componentDom.tableStore.records.length).toEqual(2);
  });

  test('And it renders a table with two rows', async () => {
    const dom = new JSDOM(toBeTestedWC.innerHTML);
    const elements = dom.window.document.querySelectorAll(`.table-row`);
    expect(elements.length).toBe(2);
  });
    
  test(`Given a SensemakerStore with one resource and two assessments 
    Then state can be mutated by adding an assessment`, async () => {
      expect(mockStore.value[mockResourceName].length).toEqual(2);
      expect(componentDom.tableStore.records.length).toEqual(2);
      mockStore.mockSetSubscribeValue(addedAssessment(mockAssessments));
      
      expect(mockStore.value[mockResourceName].length).toEqual(3);
      expect(componentDom.tableStore.records.length).toEqual(3);
    });
    test('And it renders a table with three rows', async () => {
      mockStore.mockSetSubscribeValue(addedAssessment(mockAssessments));
      const dom = await renderAndReturnDom(component);

      const elements = dom.window.document.querySelectorAll(`.table-row`);
      expect(elements.length).toBe(3);
  });

  // test(`Given a SensemakerStore with one resource and two assessments 
  //   Then state can be mutated by removing an assessment`, async () => {
  //     expect(mockStore.value[mockResourceName].length).toEqual(2);

  //     let mutatedAssessments = {mockResourceName: mockAssessments[mockResourceName].slice(1)};

  //     mockStore.mockSetSubscribeValue(mutatedAssessments);
  //     expect(mockStore.value[mockResourceName].length).toEqual(1);
  // });

  // test('And it renders a table with one row', async () => {
  //     expectDomOf(toBeTestedWC).lightDom.to.equal("<div></div>");
  // });
    
});

function addedAssessment(mockAssessments: AssessmentDict) {
  const addedAssessment = {
    value: { Integer: 5 },
    dimension_eh: new Uint8Array([4, 3, 3]),
    resource_eh: new Uint8Array([4, 5, 6]),
    resource_def_eh: new Uint8Array([4, 5, 6]),
    author: new Uint8Array([21, 12, 11]),
    maybe_input_dataset: null,
    timestamp: 2343465
  };

  let mutatedAssessments = { 'abc': [...mockAssessments[mockResourceName], addedAssessment] } as AssessmentDict;
  return mutatedAssessments
}
