import { html, fixture, expect } from '@open-wc/testing';
// import { SensemakerStore, SensemakerService } from "@neighbourhoods/client";

import { FieldDefinitions, FieldDefinition, TableStore, TableStoreContext } from '@adaburrows/table-web-component';
import { Table } from './table.ts';

describe('Table', () => {
    it('adds a new row when SensemakerStore emits a new value with an extra record', async () => {
        const newRecord = { id: 123, name: 'John Doe' };
        const fieldDefs  = {
        'id': new FieldDefinition({heading: 'id'}),
        'name': new FieldDefinition({heading: 'name'})
        }

        const store = new TableStore({
            // This is the Id used to identify the table in the CSS variables and is the table's HTML id
            tableId: 'simple',
            fieldDefs,
            records: [newRecord],
            showHeader: true
        });
        const el = await fixture(html`<assessments-table .store=${store}></assessments-table>`);

        expect(el.rows).to.have.lengthOf(1);

        store.update([...store.data, { id: 456, name: 'Jane Doe' }]);
        await el.updateComplete;

        expect(el.rows).to.have.lengthOf(2);
    });
  });