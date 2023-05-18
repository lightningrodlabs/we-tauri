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
import { addedAssessment, removedAssessment } from './helpers';
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
    toBeTestedWC = componentDom.renderRoot.querySelector("adaburrows-table");
    return new JSDOM(toBeTestedWC.innerHTML);
  }

  beforeAll(async () => {
    component = html`<assessments-table></assessments-table>`;
    await initialRender(component)
    // toBeTestedWC = componentDom.renderRoot.querySelector("adaburrows-table");
  });

  describe('Given a SensemakerStore with no assessments ', () => {
    beforeEach(async () => {
      mockStore = mockSensemakerStore.resourceAssessments();
      mockStore.mockSetSubscribeValue({ 'abc': [] });
      toBeTestedWC = componentDom.renderRoot.querySelector("adaburrows-table");
    });

    test(`Then state is initialized`, async () => {
      expect(mockSensemakerStore.resourceAssessments).toHaveBeenCalled();

      expect(mockStore.value[mockResourceName].length).toEqual(0);

      expect(componentDom.tableStore).toBeDefined();
      expect(componentDom.tableStore.records.length).toEqual(0);
    });

    test('And it renders no table but gives a message', async () => {
      const dom = await renderAndReturnDom(component);
      const elements = dom.window.document.querySelectorAll(`.table-row`);
      expect(elements.length).toBe(0);

      const p = dom.window.document.querySelectorAll(`p`);
      expect(p.length).toBe(1);
      expect(p[0].textContent).toBe('No assessments found');
    });
  });

  describe('Given a SensemakerStore with one resource and two assessments', () => {
    beforeEach(async () => {
      mockStore = mockSensemakerStore.resourceAssessments();
      mockStore.mockSetSubscribeValue(mockAssessments);
      toBeTestedWC = componentDom.renderRoot.querySelector("#" + tableId);
    });

    test(`Then state is initialized`, async () => {
      expect(mockSensemakerStore.resourceAssessments).toHaveBeenCalled();

      expect(mockStore.value[mockResourceName].length).toEqual(2);
      expect(componentDom.tableStore).toBeDefined();
      expect(componentDom.tableStore.records.length).toEqual(2);
    });

    test('And it renders a table with two rows', async () => {
      const dom = await renderAndReturnDom(component);
      const elements = dom.window.document.querySelectorAll(`.table-row`);
      expect(elements.length).toBe(2);
    });

    test(`Then state can be mutated by adding an assessment`, async () => {
      expect(mockStore.value[mockResourceName].length).toEqual(2);
      expect(componentDom.tableStore.records.length).toEqual(2);
      mockStore.mockSetSubscribeValue(addedAssessment(mockAssessments, mockResourceName));

      expect(mockStore.value[mockResourceName].length).toEqual(3);
      expect(componentDom.tableStore.records.length).toEqual(3);
    });

    test('And it renders a table with three rows', async () => {
      mockStore.mockSetSubscribeValue(addedAssessment(mockAssessments, mockResourceName));
      const dom = await renderAndReturnDom(component);

      const elements = dom.window.document.querySelectorAll(`.table-row`);
      expect(elements.length).toBe(3);
    });

    test(`Then state can be mutated by removing an assessment`, async () => {
      expect(mockStore.value[mockResourceName].length).toEqual(2);
      expect(componentDom.tableStore.records.length).toEqual(2);
      mockStore.mockSetSubscribeValue(removedAssessment(mockAssessments, mockResourceName));

      expect(mockStore.value[mockResourceName].length).toEqual(1);
      expect(componentDom.tableStore.records.length).toEqual(1);
    });

    test('And it renders a table with one row', async () => {
      mockStore.mockSetSubscribeValue(removedAssessment(mockAssessments, mockResourceName));
      const dom = await renderAndReturnDom(component);

      const elements = dom.window.document.querySelectorAll(`.table-row`);
      expect(elements.length).toBe(1);
    });
  });
});