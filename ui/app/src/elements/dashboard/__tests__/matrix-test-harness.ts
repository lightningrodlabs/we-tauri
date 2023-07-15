import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { contextProvider } from '@lit-labs/context';
import { DnaHash, EntryHash } from '@holochain/client';
import { Applet } from '../../../types';
import { MockFactory } from '../../__tests__/mock-factory';
import { mockContext } from './helpers';

export type AppletTuple = [EntryHash, Partial<Applet>, DnaHash[]];

export const testAppletName = 'test-applet';

export const mockApplets: AppletTuple[] = [[
  new Uint8Array([1, 2, 3]) as EntryHash,
  {
    customName: 'UserAppletName',
    title: 'AppletTitle',
    description: 'A test applet',
    logoSrc:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAA…nGGT8mfoaf0ZOwgM08H91gsijgKjJeQAAAABJRU5ErkJggg==',
    dnaHashes: { [testAppletName]: new Uint8Array([28, 29, 30]) },
  } as Partial<Applet>,
  [new Uint8Array([1, 2, 3])] as DnaHash[],
]]

@customElement('dashboard-test-harness')
export class TestHarness extends LitElement {
  /**
   * Providing a context at the root element to maintain application state
   */
  @contextProvider({ context: mockContext })
  @property({ attribute: false })
  // Create a mock store with the mock data
  _matrixStore;

  render() {
    return html`<slot></slot>`;
  }
}
