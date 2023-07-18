import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { createContext, contextProvider } from '@lit-labs/context';
import { vi } from 'vitest';
import { Readable, readable, writable } from '@holochain-open-dev/stores';
import { AppletClassInfo, MatrixStore } from '../../../matrix-store';
import { EntryHashMap } from '../../../holo-hash-map-temp';
import { DnaHash, EntryHash } from '@holochain/client';
import { Applet } from '../../../types';

export type AppletTuple = [EntryHash, Partial<Applet>, DnaHash[]];


const applet1Name = 'test-applet';

export const mockApplets: AppletTuple[] = [[
  new Uint8Array([1, 2, 3]) as EntryHash,
  {
    customName: 'UserAppletName',
    title: 'AppletTitle',
    description: 'A test applet',
    logoSrc:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAA…nGGT8mfoaf0ZOwgM08H91gsijgKjJeQAAAABJRU5ErkJggg==',
    dnaHashes: { [applet1Name]: new Uint8Array([28, 29, 30]) },
  } as Partial<Applet>,
  [new Uint8Array([1, 2, 3])] as DnaHash[],
]]

// Mock the response of fetchAllApplets method
export function mockFetchAllApplets(
  weGroupId: DnaHash | undefined,
): Readable<AppletTuple[]> {
  return readable(mockApplets);
}
const mockMatrixReadable = mockFetchAllApplets(new Uint8Array());
const mockMatrixWritable = writable<AppletTuple[]>([]);

mockMatrixReadable.subscribe(value => {
  // Update the value of the writable store when the readable store changes
  mockMatrixWritable.set(value as any);
});

// Create a mock context with the mock store
export const mockContext = createContext<Partial<MatrixStore>>('hc_zome_we/matrix_context');

const mockFetchAllAppletsResponse = {
  store: () => mockMatrixWritable,
  subscribe: mockFetchAllApplets(new Uint8Array()).subscribe,
  unsubscribe: vi.fn(),
  mockSetSubscribeValue: (value: AppletTuple[]): void => mockMatrixWritable.update(_ => value),
};

export const mockMatrixStore = {
  fetchAllApplets: vi.fn(() => mockFetchAllAppletsResponse),
};

@customElement('dashboard-test-harness')
export class TestHarness extends LitElement {
  /**
   * Providing a context at the root element to maintain application state
   */
  @contextProvider({ context: mockContext })
  @property({ attribute: false })
  // Create a mock store with the mock data
  _matrixStore: Object = mockMatrixStore;

  render() {
    return html`<slot></slot>`;
  }
}
