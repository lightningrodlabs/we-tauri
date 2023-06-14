import { AssessmentDict } from './../helpers/types';
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { createContext, ContextRoot, contextProvider} from '@lit-labs/context';
import { vi } from 'vitest'
import { SensemakerStore } from '@neighbourhoods/client';
import { writable } from '@holochain-open-dev/stores';

export const mockAssessments: AssessmentDict = {'abc' : [
    {
      value: { Integer: 10 },
      dimension_eh: new Uint8Array([1, 2, 3]),
      resource_eh: new Uint8Array([4, 5, 6]),
      resource_def_eh: new Uint8Array([4, 5, 6]),
      author: new Uint8Array([13, 14, 15]),
      maybe_input_dataset: null,
      timestamp: 32445
    },
    {
      value: { Float: 4.5 },
      dimension_eh: new Uint8Array([16, 17, 18]),
      resource_eh: new Uint8Array([19, 20, 21]),
      resource_def_eh: new Uint8Array([19, 20, 21]),
      author: new Uint8Array([28, 29, 30]),
      maybe_input_dataset: null,
      timestamp: 32445
    },
  ]};

// Create a mock context with the mock store
export const mockContext = createContext<Partial<SensemakerStore>>('sensemaker-store-context');

const mockSensemakerWritable = writable<AssessmentDict>({});

const mockResourceAssessmentsResponse = {
  value: null,
  store: () => mockSensemakerWritable, 
  subscribe: mockSensemakerWritable.subscribe, 
  unsubscribe: vi.fn(),
  mockSetSubscribeValue: (value: AssessmentDict): void => mockUpdateSensemakerStore(value)
};

// Helper to make mockResourceAssessmentsResponse like a reactive StoreSubscriber
function mockUpdateSensemakerStore(newValue) {
  mockResourceAssessmentsResponse.value = newValue;
  mockSensemakerWritable.update((oldValue) => newValue)
}

export const mockSensemakerStore =  {
  resourceAssessments: vi.fn(() => mockResourceAssessmentsResponse),
};

@customElement('test-harness')
export class TestHarness extends LitElement {
  /**
   * Providing a context at the root element to maintain application state
   */
  @contextProvider({ context: mockContext })
  @property({attribute: false})
  // Create a mock store with the mock data
  _sensemakerStore: Object = mockSensemakerStore
  
  render() {
    return html`<slot></slot>`;
  }  
}
