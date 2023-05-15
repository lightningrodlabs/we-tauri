// import { SensemakerStore, SensemakerService } from "@neighbourhoods/client";

import { assert, fixture, html, elementUpdated } from '@open-wc/testing';
import { it, describe, expect, test, beforeAll, beforeEach } from 'vitest'

import '../table';
import './test-harness';
import { AssessmentDict, TestHarness, mockAssessments, mockStore } from './test-harness';
import { Writable, get } from '@holochain-open-dev/stores';
/**
* @vitest-environment jsdom
*/

export const stateful = async (component) => fixture(html`
    <test-harness>${component}</test-harness>
  `)

describe('Table', () => {
  let component, harness;
  let mockWritable;

  beforeAll(async () => {
    component = html`<assessments-table></assessments-table>`;
    harness = await stateful(component);
    
    const toBeTestedComponent : any = harness.querySelector('assessments-table');
    await toBeTestedComponent.updateComplete;
  });
  
  beforeEach(async () => {
    mockWritable = mockStore.resourceAssessments();
  });

  test('Given a SensemakerStore with one resource and two assessments Then state is initialized', async () => {
      expect(mockStore.resourceAssessments).toHaveBeenCalled();

      expect(get(mockWritable.store())!['abc'].length).toEqual(2);
  });
    
  test('Given a SensemakerStore with one resource and two assessments Then state can be mutated', async () => {
      expect(get(mockWritable.store())!['abc'].length).toEqual(2);

      let mutatedAssessments = {...mockAssessments, 'def': mockAssessments['abc'].slice(1)};

      mockWritable.mockSetSubscribeValue(mutatedAssessments);
      expect(get(mockWritable.store())!['def'].length).toEqual(1);
  });
    
});