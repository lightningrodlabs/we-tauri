import { AssessmentDict, AssessmentTableRecord } from '../helpers/types';
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { createContext, ContextRoot, contextProvider} from '@lit-labs/context';
import { vi } from 'vitest'
import { AppletConfig, SensemakerStore } from '@neighbourhoods/client';
import { writable } from '@holochain-open-dev/stores';
import { FieldDefinition } from '@adaburrows/table-web-component';
import { generateHeaderHTML } from '../helpers/functions';

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

export const mockAppletConfig : AppletConfig = {
  name: 'An applet',
  role_name: 'applet_role',
  ranges: {
      my_range: new Uint8Array([1,2,3])
  },
  dimensions: {
      my_dimension: new Uint8Array([1,2,3])
  },
  resource_defs: {
      my_resource_def: new Uint8Array([1,2,3])
  },
  methods: {
      my_method: new Uint8Array([1,2,3])
  },
  cultural_contexts: {
      my_context: new Uint8Array([1,2,3])
  },
};

// Create a mock context with the mock store
export const mockContext = createContext<Partial<SensemakerStore>>('sensemaker-store-context');

export const mockFieldDefsResourceTable = {
  five_star: new FieldDefinition<AssessmentTableRecord>({
    decorator: () => html`<p></p>`,
    heading: generateHeaderHTML('Assessment', 'Dimension 1'),
  }),
  
  importance: new FieldDefinition<AssessmentTableRecord>({
    decorator: () => html`<p></p>`,
    heading: generateHeaderHTML('Assessment', 'Dimension 2'),
  }),
  
  perceived_heat: new FieldDefinition<AssessmentTableRecord>({
    decorator: () => html`<p></p>`,
    heading: generateHeaderHTML('Assessment', 'Dimension 3'),
  }),
  
  thumbs_up: new FieldDefinition<AssessmentTableRecord>({
    decorator: () => html`<p></p>`,
    heading: generateHeaderHTML('Assessment', 'Dimension 4'),
  }),

}
const mockSensemakerWritable = writable<AssessmentDict>({});
const mockAppletDetailsWritable = writable<AppletConfig>();

const mockResourceAssessmentsResponse = {
  value: null,
  store: () => mockSensemakerWritable, 
  subscribe: mockSensemakerWritable.subscribe, 
  unsubscribe: vi.fn(),
  mockSetSubscribeValue: (value: AssessmentDict): void => mockUpdateSensemakerStore(value)
};
export const mockAppletConfigResponse = {
  store: () => mockAppletDetailsWritable, 
  subscribe: mockAppletDetailsWritable.subscribe, 
  unsubscribe: vi.fn(),
  mockSetSubscribeValue: (value: AppletConfig): void => mockAppletDetailsWritable.update((_) => value)
};

// Helper to make mockResourceAssessmentsResponse like a reactive StoreSubscriber
function mockUpdateSensemakerStore(newValue) {
  mockResourceAssessmentsResponse.value = newValue;
  mockSensemakerWritable.update((_) => newValue)
}

export const mockSensemakerStore =  {
  resourceAssessments: vi.fn(() => mockResourceAssessmentsResponse),
  appletConfig: vi.fn(() => mockAppletConfigResponse),
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
