// import { SensemakerStore, SensemakerService } from "@neighbourhoods/client";

import { encodeHashToBase64 } from "@holochain/client";
import { fixture, html } from '@open-wc/testing';
import { assert, it, describe, expect, test, vi } from 'vitest'
import { Table } from '../table';
import { createContext } from '@lit-labs/context';

/**
* @vitest-environment jsdom
*/

describe('Table', () => {
  it('renders a table with the correct number of rows', async () => {
    const mockAssessments = [
      {
        value: { Integer: 10 },
        dimension_eh: encodeHashToBase64(new Uint8Array([1, 2, 3])),
        resource_eh: encodeHashToBase64(new Uint8Array([4, 5, 6])),
        author: encodeHashToBase64(new Uint8Array([13, 14, 15])),
        timestamp: 123456789,
      },
      {
        value: { Float: 4.5 },
        dimension_eh: encodeHashToBase64(new Uint8Array([16, 17, 18])),
        resource_eh: encodeHashToBase64(new Uint8Array([19, 20, 21])),
        author: encodeHashToBase64(new Uint8Array([28, 29, 30])),
        timestamp: 987654321,
      },
    ];

    // Create a mock store with the mock data
    const mockStore = {
        dispatch: vi.fn(),
        subscribe: vi.fn(),
        getHeadings: vi.fn(),
        getRows: vi.fn(),
        tableId: 'mockId',
        caption: 'mockCaption',
        records: mockAssessments,
    };

    // Create a mock context with the mock store
    const mockContext = createContext(mockStore);

    // Wrap the component in the mock context for testing
    const el = await fixture<Table>(
      html`<${mockContext.Provider} value=${mockStore}><assessments-table></assessments-table></${mockContext.Provider}>`
    );

    assert.equal(el.assessments?.length, 2);
    assert.dom('table tbody tr', { count: 2 });
  });
});