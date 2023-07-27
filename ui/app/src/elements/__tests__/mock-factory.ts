import { AppletConfig } from '@neighbourhoods/client/dist/applet';
import { AssessmentDict, AssessmentTableRecord } from '../components/helpers/types';
import { FieldDefinition } from '@adaburrows/table-web-component';
import { generateHeaderHTML } from '../components/helpers/functions';
import { html } from 'lit';
import { Applet } from '../../types';
import { EntryHash, DnaHash } from '@holochain/client';
import { AppletTuple, testAppletBaseRoleName } from '../dashboard/__tests__/matrix-test-harness';
import { writable } from 'svelte/store';
import { vi } from 'vitest';
import { Dimension, SensemakerStore } from '@neighbourhoods/client';
import { AppletInstanceInfo } from '../../matrix-store';
import { encode } from '@msgpack/msgpack';

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
    seed: number = 0,
    name = 'An applet' + (seed + 1),
    role_name = testAppletBaseRoleName,
    // installed_app_id = testAppletBaseRoleName + (seed + 1),
    ranges = { my_range: new Uint8Array([1, 2, 3].map(x => x * (seed + 1))) },
    dimensions = { my_dimension: new Uint8Array([1, 2, 3].map(x => x * (seed + 1))) },
    resource_defs = {
      ['my_resource_def' + (seed + 1)]: new Uint8Array([1, 2, 3].map(x => x * (seed + 1))),
      ['another_resource_def' + (seed + 1)]: new Uint8Array([1, 2, 3].map(x => x * (seed + 1))),
    },
    methods = { my_method: new Uint8Array([1, 2, 3].map(x => x * (seed + 1))) },
    cultural_contexts = { my_context: new Uint8Array([1, 2, 3].map(x => x * (seed + 1))) },
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

  static createAppletConfigDict(
    seed = 0,
    appletInstanceIds = [...new Array(seed + 1)].map(
      (testConfig, idx) => testAppletBaseRoleName + (idx + 1),
    ),
  ): { [appletInstanceId: string]: AppletConfig } {
    let result = {};
    appletInstanceIds.forEach((id, index) => {
      result[id] = this.createAppletConfig(index);
    });
    return result;
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
    seed = 0,
    roleName = testAppletBaseRoleName + (seed + 1),
    entryHash = [1, 2, 3],
    installed_app_id = testAppletBaseRoleName + (seed + 1),
    customName = 'UserAppletName' + (seed + 1),
    title = 'AppletTitle' + (seed + 1),
    description = 'A test applet' + (seed + 1),
    logoSrc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAA…nGGT8mfoaf0ZOwgM08H91gsijgKjJeQAAAABJRU5ErkJggg==',
    dnaHashes = {},
    dnaHash = [1, 2, 3].map(x => x * (seed + 1)),
  ): AppletTuple {
    dnaHashes = { [roleName]: new Uint8Array([28, 29, 30].map(x => x * (seed + 1))) };
    const applet: AppletTuple = [
      new Uint8Array([1, 2, 3].map(x => x * (seed + 1))) as EntryHash,
      {
        customName,
        title,
        description,
        installed_app_id,
        logoSrc,
        dnaHashes,
      } as Partial<Applet>,
      [new Uint8Array([1, 2, 3].map(x => x * (seed + 1)))] as DnaHash[],
    ];

    return applet;
  }

  static createAppletInstanceInfos(numberInArray: number): Partial<AppletInstanceInfo>[] {
    return this.createAppletTuples(numberInArray).map(tuple => ({
      appInfo: { installed_app_id: tuple[1].installed_app_id },
      applet: tuple[1] as Applet,
    }));
  }
  static createAppletTuples(numberInArray: number): AppletTuple[] {
    return [...new Array(numberInArray)].map((_, index) => this.createAppletTuple(index));
  }

  static mockStoreResponse(methodName: string) {
    let mockStore: any = {};
    const mockClient = (mockDimensions: any = [{
      "name": "importance",
      "range": {
        "name": "1-scale",
        "kind": {
            "Integer": { "min": 0, "max": 1 }
        }
    },
      "computed": false
  }]) => ({
      appInfo: vi.fn(() => ({
        cell_info: {
          sensemaker: [null, { cloned: { cell_id: 'mock-cell-id' } }],
        },
      })),
      callZome: vi.fn(({fn_name}) => {
        switch (fn_name) {
          case 'get_dimensions':
            return [mockDimensions].map(dimension => ({entry: { Present: { 'entry': encode(dimension) } }}))
          default:
            break;
        }
      }),
    });
    mockStore.client = mockClient();

    switch (methodName) {
      case 'matrix-sensemaker-for-we-group-id':
        // A nested mock Sensemaker store
        const mockSMStore = this.mockStoreResponse('all');
        const mockStoreWritable = writable<Partial<SensemakerStore>>(mockSMStore);
        return {
          store: () => mockStoreWritable,
          subscribe: mockStoreWritable.subscribe,
          unsubscribe: vi.fn(),
          mockSetStoreResourceAssessments: (value: AssessmentDict): void => {
            mockSMStore.setResourceAssessments(value);
            mockStoreWritable.update(_ => mockSMStore);
          },
          mockSetStoreAppConfigs: (value: { [appletInstanceId: string]: AppletConfig }): void => {
            mockSMStore.setAppletConfigs(value);
            mockStoreWritable.update(_ => mockSMStore);
          },
          client: mockClient,
        };

      case 'fetchAllApplets':
        const mockAppletsWritable = writable<AppletTuple[]>([]);

        return {
          store: () => mockAppletsWritable,
          subscribe: mockAppletsWritable.subscribe,
          unsubscribe: vi.fn(),
          mockSetSubscribeValue: (value: AppletTuple[]): void =>
            mockAppletsWritable.update(_ => value),
        };

      case 'getAppletInstanceInfosForGroup':
        const mockAppletInstancesWritable = writable<AppletInstanceInfo[]>([]);

        return {
          store: () => mockAppletInstancesWritable,
          subscribe: mockAppletInstancesWritable.subscribe,
          unsubscribe: vi.fn(),
          mockSetSubscribeValue: (value: AppletInstanceInfo[]): void =>
            mockAppletInstancesWritable.update(_ => value),
        };

      case 'all': // mocks all available SensemakerStore methods
      case 'resourceAssessments':
        const mockSensemakerWritable = writable<AssessmentDict>({});
        // Add value property to help mock StoreSubscriber
        const mockResourceAssessmentsResponse = {
          value: null,
          store: () => mockSensemakerWritable,
          subscribe: mockSensemakerWritable.subscribe,
          unsubscribe: vi.fn(),
          mockSetSubscribeValue: (value: AssessmentDict): void => mockUpdateSensemakerStore(value),
        };
        // Helper to make mockResourceAssessmentsResponse like a reactive StoreSubscriber
        function mockUpdateSensemakerStore(newValue) {
          mockResourceAssessmentsResponse.value = newValue;
          mockSensemakerWritable.update(_ => newValue);
        }
        mockStore.resourceAssessments = vi.fn(() => mockResourceAssessmentsResponse);
        mockStore.setResourceAssessments = mockUpdateSensemakerStore.bind(
          mockResourceAssessmentsResponse,
        );

      case 'appletConfigs':
        const mockAppletDetailsWritable = writable<{ [appletInstanceId: string]: AppletConfig }>();
        const mockAppletConfigsResponse = {
          store: () => mockAppletDetailsWritable,
          subscribe: mockAppletDetailsWritable.subscribe,
          unsubscribe: vi.fn(),
          mockSetSubscribeValue: (value: { [appletInstanceId: string]: AppletConfig }): void =>
            mockAppletDetailsWritable.update(_ => value),
        };
        function mockUpdateAppletConfigs(newValue) {
          mockAppletDetailsWritable.update(_ => newValue);
        }
        mockStore.appletConfigs = vi.fn(() => mockAppletConfigsResponse);
        mockStore.setAppletConfigs = mockUpdateAppletConfigs.bind(mockAppletConfigsResponse);
        mockStore.setAppletConfigDimensions = (dimensions: any) => { mockStore.client = mockClient(dimensions)};
      default:
        return mockStore;
    }
  }
}
