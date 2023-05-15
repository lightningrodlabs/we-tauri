// import { SensemakerStore, SensemakerService } from "@neighbourhoods/client";

import { assert, fixture, html, elementUpdated } from '@open-wc/testing';
import { it, describe, expect, test, beforeAll } from 'vitest'

import '../table';
import './test-harness';
import { TestHarness, mockAssessments, mockStore } from './test-harness';
/**
* @vitest-environment jsdom
*/

export const stateful = async (component) => fixture(html`
    <test-harness>${component}</test-harness>
  `)

describe('Table', () => {
  test('Given a SensemakerStore with one resource and two assessments', async () => {
    beforeAll(async () => {
      const component = html`<assessments-table></assessments-table>`;
      const harness : any = await stateful(component);
      
      const toBeTestedComponent : any = harness.querySelector('assessments-table');
      await toBeTestedComponent.updateComplete;
    });
    
    it('Then it loads the state', async () => {
      expect(mockStore.resourceAssessments).toHaveBeenCalled();

      const mockWritable = mockStore.resourceAssessments();
      expect(Object.values(mockWritable.value)[0].length).toEqual(2);
    });
    
    it('And renders a table with the correct number of rows', async () => {
    // expect(mockStore.resourceAssessments).toHaveBeenCalled();

    // const mockWritable = mockStore.resourceAssessments();
    // expect(Object.values(mockWritable.value)[0].length).toEqual(2);
    
    // mockWritable.mockSetSubscribeValue({...mockAssessments, 'def': mockAssessments['abc'].slice(1)});
    // expect(mockWritable.value.length).toEqual(3);
    });
  });
});