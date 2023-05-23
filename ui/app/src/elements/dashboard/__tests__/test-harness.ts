import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { createContext, contextProvider} from '@lit-labs/context';
import { vi } from 'vitest'
import { Readable, readable, writable } from '@holochain-open-dev/stores';
import { EntryHashMap } from '@holochain-open-dev/utils';
import { AppletClassInfo, MatrixStore } from '../../../matrix-store';

type AppletDict = Partial<EntryHashMap<AppletClassInfo>>;

export const mockApplets: AppletDict = { _values : {
  // Add mock applet values here
  'abc': {
    hash: new Uint8Array([1, 2, 3]),
    value: {
      devhubHappReleaseHash: new Uint8Array([1, 2, 3]),
      title: 'Mock Applet',
      logoSrc: undefined,
      description: 'This is a mock applet.',
    },
  },
  'def': {
    hash: new Uint8Array([4, 5, 6]),
    value: {
      devhubHappReleaseHash: new Uint8Array([1, 2, 3]),
      title: 'Mock Applet 2',
      logoSrc: undefined,
      description: 'This is another mock applet.',
    },
  },
}}

// Mock the response of installedAppletClasses method
export function mockInstalledAppletClasses(): Readable<AppletDict> {
  const mockAppletClasses: AppletDict = new EntryHashMap<AppletClassInfo>();
  mockAppletClasses._values = mockApplets as any;

  return readable(
    mockAppletClasses
  );
}
const mockMatrixReadable = mockInstalledAppletClasses();
const mockMatrixWritable = writable<AppletDict>({});

mockMatrixReadable.subscribe((value) => {
  // Update the value of the writable store when the readable store changes
  mockMatrixWritable.set(value);
});

// Create a mock context with the mock store
export const mockContext = createContext<Partial<MatrixStore>>('hc_zome_we/matrix_context');

const mock_allAppletClassesPropertyValue = {
  value: null,
  store: () => mockMatrixWritable, 
  subscribe: mockInstalledAppletClasses().subscribe, 
  unsubscribe: vi.fn(),
  mockSetSubscribeValue: (value: AppletDict): void => mockUpdateMatrixStore(value)
};

// Helper to make mock_allAppletClassesPropertyValue act like a reactive StoreSubscriber
function mockUpdateMatrixStore(newValue) {
  mock_allAppletClassesPropertyValue.value = newValue;
  mockMatrixWritable.update((_) => newValue)
}

export const mockMatrixStore =  {
  _allAppletClasses: mock_allAppletClassesPropertyValue,
};

@customElement('test-harness')
export class TestHarness extends LitElement {
  /**
   * Providing a context at the root element to maintain application state
   */
  @contextProvider({ context: mockContext })
  @property({attribute: false})
  // Create a mock store with the mock data
  _matrixStore: Object = mockMatrixStore
  
  render() {
    return html`<slot></slot>`;
  }  
}
