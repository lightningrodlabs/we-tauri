const { JSDOM } = require('jsdom');
import { fixture, html } from '@open-wc/testing';
import { describe, expect, test, beforeAll, beforeEach } from 'vitest'
import { expect as expectDomOf } from '@esm-bundle/chai'
// import { getDiffableHTML  } from '@open-wc/semantic-dom-diff';

import './test-harness';
import { mockAssessments, mockSensemakerStore } from './test-harness';
import { addedAssessment, removedAssessment } from './helpers';
import '../table';
import { tableId } from '../table';
import { AssessmentTableType } from '../helpers/types';
/**
* @vitest-environment jsdom
*/

export const mockResourceName = 'abc';

export const stateful = async (component) => fixture(html`
    <test-harness>${component}</test-harness>
`)

describe('Table', () => {
  let component, harness, componentDom, toBeTestedSubComponent;
  let mockStore;

  const initialRender = async (testComponent) => {
    harness = await stateful(component);
    componentDom = harness.querySelector('dashboard-table');
    await componentDom.updateComplete;
  }
  const renderAndReturnDom = async (testComponent, subComponent) => {
    await initialRender(testComponent)
    const root = componentDom.renderRoot;
    if(!!subComponent) {
      toBeTestedSubComponent = root.querySelector(subComponent);
      return new JSDOM(toBeTestedSubComponent.renderRoot.innerHTML);
    }
    return new JSDOM(root.innerHTML);
  }

  beforeAll(async () => {
    component = html`<dashboard-table
    .resourceName=${mockResourceName}
        .assessments=${mockAssessments}
        .tableType=${AssessmentTableType.Context}
        .contextFieldDefs=${{}}></dashboard-table>`;
    await initialRender(component)
    
  });

  describe('Given a SensemakerStore with no assessments ', () => {
    beforeEach(async () => {
      mockStore = mockSensemakerStore.resourceAssessments();
      mockStore.mockSetSubscribeValue({ 'abc': [] });
    });

    test(`Then state is initialized`, async () => {
      expect(mockSensemakerStore.resourceAssessments).toHaveBeenCalled();

      expect(mockStore.value[mockResourceName].length).toEqual(0);

      expect(componentDom.tableStore).toBeDefined();
      expect(componentDom.tableStore.records.length).toEqual(0);
    });

    test('And it renders no table but gives a message', async () => {
      const dom = await renderAndReturnDom(component, false);
      const elements = dom.window.document.querySelectorAll(`table`);
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
      toBeTestedSubComponent = componentDom.renderRoot.querySelector("#" + tableId);
    });

    test(`Then state is initialized`, async () => {
      expect(mockSensemakerStore.resourceAssessments).toHaveBeenCalled();

      expect(mockStore.value[mockResourceName].length).toEqual(2);
      expect(componentDom.tableStore).toBeDefined();
      expect(componentDom.tableStore.records.length).toEqual(2);
    });

    test('And it renders a header row', async () => {
      const dom = await renderAndReturnDom(component, 'adaburrows-table');
      const elements = dom.window.document.querySelectorAll(`thead tr`);
      expect(elements.length).toBe(1);
    });
    test('And the header row has the correct number of columns ', async () => {
      const dom = await renderAndReturnDom(component, 'adaburrows-table');
      const elements = dom.window.document.querySelectorAll(`thead tr th`);
      expect(elements.length).toBe(4);
    });
    test('And the header row has the correct column headings ', async () => {
      const dom = await renderAndReturnDom(component, 'adaburrows-table');
      const elements = dom.window.document.querySelectorAll(`thead tr th`);
      expect([...elements].map((node) => node.textContent.trim())).eql([
        "Value",
        "Dimension",
        "Resource",
        "Author",
      ]);
    });

    test('And it renders a table body with two rows', async () => {
      const dom = await renderAndReturnDom(component, 'adaburrows-table');
      const elements = dom.window.document.querySelectorAll(`tbody tr`);
      expect(elements.length).toBe(2);
    });

    test(`Then state can be mutated by adding an assessment`, async () => {
      expect(mockStore.value[mockResourceName].length).toEqual(2);
      expect(componentDom.tableStore.records.length).toEqual(2);
      mockStore.mockSetSubscribeValue(addedAssessment(mockAssessments, mockResourceName));

      expect(mockStore.value[mockResourceName].length).toEqual(3);
      expect(componentDom.tableStore.records.length).toEqual(3);
    });

    test('And it renders a table body with three rows', async () => {
      mockStore.mockSetSubscribeValue(addedAssessment(mockAssessments, mockResourceName));
      const dom = await renderAndReturnDom(component, 'adaburrows-table');

      const elements = dom.window.document.querySelectorAll(`tbody tr`);
      expect(elements.length).toBe(3);
    });

    test(`Then state can be mutated by removing an assessment`, async () => {
      expect(mockStore.value[mockResourceName].length).toEqual(2);
      expect(componentDom.tableStore.records.length).toEqual(2);
      mockStore.mockSetSubscribeValue(removedAssessment(mockAssessments, mockResourceName));

      expect(mockStore.value[mockResourceName].length).toEqual(1);
      expect(componentDom.tableStore.records.length).toEqual(1);
    });

    test('And it renders a table body with one row', async () => {
      mockStore.mockSetSubscribeValue(removedAssessment(mockAssessments, mockResourceName));
      const dom = await renderAndReturnDom(component, 'adaburrows-table');

      const elements = dom.window.document.querySelectorAll(`tbody tr`);
      expect(elements.length).toBe(1);
    });
  });
});