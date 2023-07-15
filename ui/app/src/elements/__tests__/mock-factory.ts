import { AppletConfig } from '@neighbourhoods/client/dist/applet';
import { AssessmentDict, AssessmentTableRecord } from '../components/helpers/types';
import { FieldDefinition } from '@adaburrows/table-web-component';
import { generateHeaderHTML } from '../components/helpers/functions';
import { html } from 'lit';
import { Applet } from '../../types';
import { EntryHash, DnaHash } from '@holochain/client';
import { AppletTuple, testAppletName } from '../dashboard/__tests__/matrix-test-harness';
import { writable } from 'svelte/store';
import { vi } from 'vitest';
import { SensemakerStore } from '@neighbourhoods/client';

export class MockFactory {
  static createAssessment(
    value = { Integer: 10 },
    dimension = [1, 2, 3],
    resource = [4, 5, 6],
    resource_def = [4, 5, 6],
    author = [13, 14, 15],
    timestamp = 32445,
  ) {
    return {
      value: value,
      dimension_eh: new Uint8Array(dimension),
      resource_eh: new Uint8Array(resource),
      resource_def_eh: new Uint8Array(resource_def),
      author: new Uint8Array(author),
      maybe_input_dataset: null,
      timestamp: timestamp,
    };
  }

  static createAssessmentDict(
    entries = [
      [
        'abc',
        [
          [{ Integer: 10 }, [1, 2, 3], [4, 5, 6], [4, 5, 6], [13, 14, 15], 32445],
          [{ Float: 4.5 }, [16, 17, 18], [19, 20, 21], [19, 20, 21], [28, 29, 30], 32445],
        ],
      ],
    ],
  ): AssessmentDict {
    let result = {};
    entries.forEach(entry => {
      const [key, assessments] = entry;
      result[key as keyof AssessmentDict] = (assessments as any).map(assessment =>
        this.createAssessment(...assessment),
      );
    });
    return result;
  }

  static createAppletConfig(
    numberOfResourceDefs: number = 1,
    name = 'An applet',
    role_name = 'applet_role',
    ranges = { my_range: new Uint8Array([1, 2, 3]) },
    dimensions = { my_dimension: new Uint8Array([1, 2, 3]) },
    resource_defs = { my_resource_def: new Uint8Array([1, 2, 3]) },
    methods = { my_method: new Uint8Array([1, 2, 3]) },
    cultural_contexts = { my_context: new Uint8Array([1, 2, 3]) },
  ): AppletConfig {
    return {
      name: name,
      role_name: role_name,
      ranges: ranges,
      dimensions: dimensions,
      resource_defs: resource_defs,
      methods: methods,
      cultural_contexts: cultural_contexts,
    };
  }

  static createFieldDefsResourceTable(
    dimensions = ['Dimension 1', 'Dimension 2', 'Dimension 3', 'Dimension 4'],
  ) {
    let fieldDefsResourceTable = {};

    for (let i = 0; i < dimensions.length; i++) {
      const dimension = dimensions[i];
      const key = dimension.replace(' ', '_').toLowerCase(); // transforms 'Dimension 1' into 'dimension_1'
      fieldDefsResourceTable[key] = new FieldDefinition<AssessmentTableRecord>({
        decorator: () => html`<p></p>`,
        heading: generateHeaderHTML('Assessment', dimension),
      });
    }

    return fieldDefsResourceTable;
  }
  static createAppletTuple(
    roleName = testAppletName,
    entryHash = [1, 2, 3],
    customName = 'UserAppletName',
    title = 'AppletTitle',
    description = 'A test applet',
    logoSrc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAA…nGGT8mfoaf0ZOwgM08H91gsijgKjJeQAAAABJRU5ErkJggg==',
    dnaHashes = {},
    dnaHash = [1, 2, 3],
  ): AppletTuple {
    dnaHashes = { [roleName]: new Uint8Array([28, 29, 30]) };
    const applet: AppletTuple = [
      new Uint8Array([1, 2, 3]) as EntryHash,
      {
        customName,
        title,
        description,
        logoSrc,
        dnaHashes,
      } as Partial<Applet>,
      [new Uint8Array([1, 2, 3])] as DnaHash[],
    ];

    return applet;
  }

  static createAppletTuples(numberInArray: number
  ): AppletTuple[] {
    return [...new Array(numberInArray)].map((applet, index) => this.createAppletTuple('test-applet'));
  }

  static mockStoreResponse(methodName: string) {
    let mockStore : any = {};
    
    switch (methodName) {
      case 'matrix-sensemaker-for-we-group-id':
        // A nested mock Sensemaker store
        const mockSMStore = this.mockStoreResponse('all');
        const mockStoreWritable = writable<Partial<SensemakerStore>>(mockSMStore);
        return {
          store: () => mockStoreWritable, 
          subscribe: mockStoreWritable.subscribe, 
          unsubscribe: vi.fn(),
          mockSetStoreResourceAssessments: (value: AssessmentDict) : void => {mockSMStore.setResourceAssessments(value); mockStoreWritable.update( _ => mockSMStore)  },
          mockSetStoreAppConfig: (value: AppletConfig) : void => {mockSMStore.setAppletConfig(value); mockStoreWritable.update( _ => mockSMStore)  }
        };

      case 'fetchAllApplets':
        const mockAppletsWritable = writable<AppletTuple[]>([]);
        
        return {
          store: () => mockAppletsWritable,
          subscribe: mockAppletsWritable.subscribe,
          unsubscribe: vi.fn(),
          mockSetSubscribeValue: (value: AppletTuple[]): void => mockAppletsWritable.update(_ => value),
        }

      case 'all': // mocks all available SensemakerStore methods
      case 'resourceAssessments':
        const mockSensemakerWritable = writable<AssessmentDict>({});
        // Add value property to help mock StoreSubscriber
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
          mockSensemakerWritable.update((_) => newValue)
        }
        mockStore.resourceAssessments = vi.fn(() => mockResourceAssessmentsResponse);
        mockStore.setResourceAssessments = mockUpdateSensemakerStore.bind(mockResourceAssessmentsResponse)

      case 'appletConfig':
        const mockAppletDetailsWritable = writable<AppletConfig>();
        const mockAppletConfigResponse = {
          store: () => mockAppletDetailsWritable, 
          subscribe: mockAppletDetailsWritable.subscribe, 
          unsubscribe: vi.fn(),
          mockSetSubscribeValue: (value: AppletConfig): void => mockAppletDetailsWritable.update((_) => value)
        };
        function mockUpdateAppletConfig(newValue) {
          mockAppletDetailsWritable.update((_) => newValue)
        }
        mockStore.appletConfig = vi.fn(() => mockAppletConfigResponse);
        mockStore.setAppletConfig = mockUpdateAppletConfig.bind(mockAppletConfigResponse);
      default:
        return mockStore
    }
  }
}
