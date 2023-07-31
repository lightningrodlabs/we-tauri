import '@webcomponents/scoped-custom-element-registry/scoped-custom-element-registry.min.js';
import { MockFactory } from './../../__tests__/mock-factory';
const { JSDOM } = require('jsdom');
import { fixture, html } from '@open-wc/testing';
import { describe, expect, test, beforeAll, beforeEach } from 'vitest';

import './sensemaker-store-test-harness';
import {
  mockAssessments,
  mockFieldDefsResourceTable,
} from './sensemaker-store-test-harness';
import { addedAssessment, removedAssessment, mapMockedAssessment, stateful } from './helpers';
import '../table';
import { tableId } from '../table';
import { AssessmentTableType } from '../helpers/types';
/**
 * @vitest-environment jsdom
 */

export const mockResourceName = 'abc';

describe('StatefulTable', () => {
  let component, harness, componentDom, toBeTestedSubComponent;
  let mockStore;

  const initialRender = async testComponent => {
    harness = await stateful(component);
    componentDom = harness.querySelector('dashboard-table');
    await componentDom.updateComplete;
  };
  const renderAndReturnDom = async (testComponent, subComponentTag) => {
    await initialRender(testComponent);

    const root = componentDom.renderRoot;
    if (!!subComponentTag) {
      toBeTestedSubComponent = root.querySelector(subComponentTag);
      
      return new JSDOM(toBeTestedSubComponent.renderRoot.innerHTML);
    }
    return new JSDOM(root.innerHTML);
  };

  describe('Given a SensemakerStore with no assessments ', () => {
    beforeEach(async () => {
      component = html`<dashboard-table
        .resourceName=${mockResourceName}
        .assessments=${{ abc: [] }}
        .tableType=${AssessmentTableType.Resource}
        .contextFieldDefs=${undefined}
      ></dashboard-table>`;
      mockStore = MockFactory.mockStoreResponse('resourceAssessments').resourceAssessments();
      mockStore.mockSetSubscribeValue({ abc: [] });
      await initialRender(component);
    });

    test(`Then state is initialized`, async () => {
      expect(mockStore.value[mockResourceName].length).toEqual(0);

      expect(componentDom.tableStore).toBeDefined();
      expect(componentDom.tableStore.records[mockResourceName].length).toEqual(0);
    });

    test('And it renders no table but renders a skeleton', async () => {
      const dom = await renderAndReturnDom(component, false);
      const elements = dom.window.document.querySelectorAll(`table`);
      expect(elements.length).toBe(0);

      const skeleton = dom.window.document.querySelectorAll(`.skeleton-main-container`);
      expect(skeleton.length).toBe(1);
    });
  });

  describe('Given a SensemakerStore with one resource and two assessments', () => {
    beforeEach(async () => {
      mockStore = MockFactory.mockStoreResponse('resourceAssessments').resourceAssessments();
      mockStore.mockSetSubscribeValue(mockAssessments);
      const mappedAssessmentDict = { 'abc' : mockAssessments['abc'].map(mapMockedAssessment)};

      component = html`<dashboard-table
        .resourceName=${mockResourceName}
        .assessments=${mappedAssessmentDict[mockResourceName]}
        .tableType=${AssessmentTableType.Resource}
        .contextFieldDefs=${mockFieldDefsResourceTable}
      ></dashboard-table>`;
      await initialRender(component);

      toBeTestedSubComponent = componentDom.renderRoot.querySelector('#' + tableId);
    });

    test(`Then state is initialized`, async () => {
      expect(mockStore.value[mockResourceName].length).toEqual(2);
      expect(componentDom.tableStore).toBeDefined();
      expect(componentDom.tableStore.records.length).toEqual(2);
    });

    test('And it renders a header row', async () => {
      const dom = await renderAndReturnDom(component, 'wc-table');
      const elements = dom.window.document.querySelectorAll(`thead tr`);
      expect(elements.length).toBe(1);
    });
    test('And the header row has the correct number of columns ', async () => {
      const dom = await renderAndReturnDom(component, 'wc-table');
      const elements = dom.window.document.querySelectorAll(`thead tr th`);

      const numberOfContexts = Object.keys(mockFieldDefsResourceTable).length;
      expect(elements.length).toBe(numberOfContexts + 2); // two fixed columns plus contexts
    });
    test('And the header row has the correct column main headings ', async () => {
      const dom = await renderAndReturnDom(component, 'wc-table');
      const elements = dom.window.document.querySelectorAll(`thead tr th h2`);
      expect([...elements].map(node => node.textContent.trim())).eql([
        mockResourceName,
        'Member',
        'Dimension 1',
        'Dimension 2',
        'Dimension 3',
        'Dimension 4',
      ]);
    });
    test('And the header row has the correct column secondary headings ', async () => {
      const dom = await renderAndReturnDom(component, 'wc-table');
      const elements = dom.window.document.querySelectorAll(`thead tr th h4`);
      expect([...elements].map(node => node.textContent.trim())).eql([
        'Resource',
        'Neighbour',
        'Assessment',
        'Assessment',
        'Assessment',
        'Assessment',
      ]);
    });

    test('And it renders a table body with two rows', async () => {
      const dom = await renderAndReturnDom(component, 'wc-table');
      const elements = dom.window.document.querySelectorAll(`tbody tr`);
      expect(elements.length).toBe(2);
    });

    test(`When state is mutated by adding an assessment Then the TableStore state is changed`, async () => {
      expect(mockStore.value[mockResourceName].length).toEqual(2);
      expect(componentDom.tableStore.records.length).toEqual(2);
      mockStore.mockSetSubscribeValue(addedAssessment(mockAssessments, mockResourceName));

      expect(mockStore.value[mockResourceName].length).toEqual(3);
      
      componentDom.assessments = addedAssessment(mockAssessments, mockResourceName)[mockResourceName].map(mapMockedAssessment);
      await componentDom.updateComplete;
      expect(componentDom.tableStore.records.length).toEqual(3);
    });

    test('And it renders a table body with three rows', async () => {
      mockStore.mockSetSubscribeValue(addedAssessment(mockAssessments, mockResourceName));
      await renderAndReturnDom(component, 'wc-table');
      
      componentDom.assessments = addedAssessment(mockAssessments, mockResourceName)[mockResourceName].map(mapMockedAssessment);
      await componentDom.updateComplete;
      const newDom = (componentDom.renderRoot.querySelector('wc-table')).renderRoot.innerHTML;
      
      const elements = new JSDOM(newDom).window.document.querySelectorAll(`tbody tr`);
      expect(elements.length).toBe(3);
    });

    test(`When state is mutated by removing an assessment Then the TableStore state is changed`, async () => {
      expect(mockStore.value[mockResourceName].length).toEqual(2);
      expect(componentDom.tableStore.records.length).toEqual(2);
      mockStore.mockSetSubscribeValue(removedAssessment(mockAssessments, mockResourceName));

      expect(mockStore.value[mockResourceName].length).toEqual(1);

      componentDom.assessments = removedAssessment(mockAssessments, mockResourceName)[mockResourceName].map(mapMockedAssessment);
      await componentDom.updateComplete;
      expect(componentDom.tableStore.records.length).toEqual(1);
    });

    test('And it renders a table body with one row', async () => {
      mockStore.mockSetSubscribeValue(removedAssessment(mockAssessments, mockResourceName));
      await renderAndReturnDom(component, 'wc-table');

      componentDom.assessments = removedAssessment(mockAssessments, mockResourceName)[mockResourceName].map(mapMockedAssessment);
      await componentDom.updateComplete;
      const newDom = (componentDom.renderRoot.querySelector('wc-table')).renderRoot.innerHTML;
      
      const elements = new JSDOM(newDom).window.document.querySelectorAll(`tbody tr`);
      expect(elements.length).toBe(1);
    });
  });
});
