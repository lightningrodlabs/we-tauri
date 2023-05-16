import { expect as expectDomOf } from '@esm-bundle/chai'
import { assert, fixture, html } from '@open-wc/testing';
import { describe, expect, test, beforeAll, beforeEach } from 'vitest'

import '../table';
import './test-harness';
import { mockAssessments, mockStore } from './test-harness';
import { get } from '@holochain-open-dev/stores';
/**
* @vitest-environment jsdom
*/

export const stateful = async (component) => fixture(html`
    <test-harness>${component}</test-harness>
  `)

describe('Table', () => {
  let component, harness, toBeTestedComponent;
  let mockWritable;

  beforeAll(async () => {
    component = html`<assessments-table></assessments-table>`;
    harness = await stateful(component);
    
    toBeTestedComponent = harness.querySelector('assessments-table');
    await toBeTestedComponent.updateComplete;
  });
  
  beforeEach(async () => {
    mockWritable = mockStore.resourceAssessments();
    mockWritable.mockSetSubscribeValue(mockAssessments);
  });

  test('Given a SensemakerStore with one resource and two assessments Then state is initialized And it renders a table with two rows', async () => {
      expect(mockStore.resourceAssessments).toHaveBeenCalled();

      expect(get(mockWritable.store())!['abc'].length).toEqual(2);
      
      expectDomOf(toBeTestedComponent).shadowDom.to.equal("<div></div>");
  });
    
  test('Given a SensemakerStore with one resource and two assessments Then state can be mutated', async () => {
      expect(get(mockWritable.store())!['abc'].length).toEqual(2);

      let mutatedAssessments = {...mockAssessments, 'def': mockAssessments['abc'].slice(1)};

      mockWritable.mockSetSubscribeValue(mutatedAssessments);
      expect(get(mockWritable.store())!['def'].length).toEqual(1);
  });
    
});