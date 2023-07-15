const { JSDOM } = require('jsdom');
import '@webcomponents/scoped-custom-element-registry/scoped-custom-element-registry.min.js';
import { fixture, html } from '@open-wc/testing';
import { describe, expect, test, beforeAll, beforeEach, vi } from 'vitest';

import './matrix-test-harness';
import '../sensemaker-dashboard';
import { stateful } from './helpers';
import { getTagName } from './helpers';
import { mockAppletConfig } from '../../components/__tests__/sensemaker-store-test-harness';
import { MockFactory } from '../../__tests__/mock-factory';
import { DnaHash } from '@holochain/client';
import { get } from 'svelte/store';
import { AppletTuple } from './matrix-test-harness';

const intersectionObserverMock = () => ({
  observe: () => null,
});
window.IntersectionObserver = vi.fn().mockImplementation(intersectionObserverMock);

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

/**
 * @vitest-environment jsdom
 */

describe('SensemakerDashboard', () => {
  let component, harness, componentDom, toBeTestedSubComponent;
  let mockStore;
  let mockAppletConfigResponse, mockFetchAppletsResponse, mockSensemakerResponse;

  const initialRender = async testComponent => {
    harness = await stateful(component, mockStore);
    componentDom = harness.querySelector(getTagName(testComponent));
    await componentDom.updateComplete;
  };
  const renderAndReturnDom = async (testComponent, subComponent) => {
    await initialRender(testComponent);
    const root = componentDom.renderRoot;
    if (!!subComponent) {
      toBeTestedSubComponent = root.querySelector(subComponent);
      return new JSDOM(toBeTestedSubComponent.renderRoot.innerHTML);
    }
    return new JSDOM(root.innerHTML);
  };

  beforeAll(async () => {
    mockAppletConfigResponse = MockFactory.mockStoreResponse('appletConfig').appletConfig();
    mockFetchAppletsResponse = MockFactory.mockStoreResponse('fetchAllApplets');
    mockSensemakerResponse = MockFactory.mockStoreResponse('matrix-sensemaker-for-we-group-id');

    mockStore = {
      fetchAllApplets: vi.fn(() => mockFetchAppletsResponse),
      sensemakerStore: vi.fn((weGroupId: DnaHash | undefined) => mockSensemakerResponse),
    };

    component = html`<sensemaker-dashboard></sensemaker-dashboard>`;
    await initialRender(component);
  });

  describe('Given a MatrixStore with no applets ', () => {
    beforeEach(async () => {
      mockFetchAppletsResponse.mockSetSubscribeValue(MockFactory.createAppletTuples(0));
    });

    test('Then it renders a menu with a search bar, a Neighbourhood sub-menu, a member management sub-menu AND a Sensemaker sub-menu', async () => {
      const dom = await renderAndReturnDom(component, false);

      const searchInput = dom.window.document.querySelectorAll(`.search-input`);
      expect(searchInput.length).toBe(1);

      const subMenus = dom.window.document.querySelectorAll(`.dashboard-menu-section`);
      expect(subMenus.length).toBe(3);
    });

    // test('And it renders a label in the Neighbourhood sub-menu with the correct Neighbourhood name', async () => {
    //   const dom = await renderAndReturnDom(component, false);

    //   const neighbourhoodName = dom.window.document.querySelectorAll(`.dashboard-menu-section:first-of-type .nav-label`);
    //   expect(neighbourhoodName.length).toBe(1);
    //   expect(neighbourhoodName[0].textContent).toBe('NH NAME'); // TODO: Come back to this
    // });

    test('And the Neighbourhoods sub-menu has 2 items', async () => {
      const dom = await renderAndReturnDom(component, false);

      const elements = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(1) .nav-item`,
      );
      expect(elements.length).toBe(2);
    });

    test('And the Member Management sub-menu has 2 items', async () => {
      const dom = await renderAndReturnDom(component, false);

      const elements = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(3) .nav-item`,
      );
      expect(elements.length).toBe(2);
    });

    test('And the Sensemaker sub-menu has 0 items', async () => {
      const dom = await renderAndReturnDom(component, false);

      const elements = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) .nav-item`,
      );
      expect(elements.length).toBe(0);
    });
  });

  describe('Given a MatrixStore with an applet (AppletConfig has one resource) with no assessments in SM store', () => {
    beforeAll(async () => {
      mockSensemakerResponse.mockSetStoreAppConfig(mockAppletConfig);
      mockAppletConfigResponse.mockSetSubscribeValue(mockAppletConfig);
      mockFetchAppletsResponse.mockSetSubscribeValue(MockFactory.createAppletTuples(1));
    });

    test(`Then the Sensemaker sub-menu has one item`, async () => {
      const dom = await renderAndReturnDom(component, false);

      const elements = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) > sl-menu-item`,
      );
      expect(elements.length).toBe(1);
    });

    test(`And the Sensemaker sub-menu item has an active state`, async () => {
      const dom = await renderAndReturnDom(component, false);

      const elements = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) > sl-menu-item.active`,
      );
      expect(elements.length).toBe(1);
    });

    test(`And the Sensemaker active sub-menu item has the Applet name as a value`, async () => {
      const dom = await renderAndReturnDom(component, false);

      const elements = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) > sl-menu-item.active`,
      );
      const appletTuple : AppletTuple = get(mockFetchAppletsResponse)![0];
      expect(elements[0].textContent).toBe(appletTuple[1].customName);
    });

    test(`And the Sensemaker sub-menu has one sub-nav`, async () => {
      const dom = await renderAndReturnDom(component, false);

      const elements = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) > .sub-nav`,
      );
      expect(elements.length).toBe(1);
    });

    // test(`Then state is initialized`, async () => {
    //   expect(mockMatrixStore.resourceAssessments).toHaveBeenCalled();

    //   expect(mockStore.value[mockResourceName].length).toEqual(0);

    //   expect(componentDom.tableStore).toBeDefined();
    //   expect(componentDom.tableStore.records.length).toEqual(0);
    // });

    // test('And it renders no table but gives a message', async () => {
    //   const dom = await renderAndReturnDom(component, false);
    //   const elements = dom.window.document.querySelectorAll(`table`);
    //   expect(elements.length).toBe(0);

    //   const p = dom.window.document.querySelectorAll(`p`);

    //   expect(p.length).toBe(1);
    //   expect(p[0].textContent).toBe('No assessments found');
    // });
  });

  // describe('Given a MatrixStore with an AppletConfig with one resource and two assessments', () => {
    // beforeEach(async () => {
    //   mockAppletConfigResponse.mockSetSubscribeValue(mockAppletConfig);
    //   mockFetchAppletsResponse.mockSetSubscribeValue(MockFactory.createAppletTuples(1));
    // });

    // test(`Then state is initialized`, async () => {
    //   expect(mockMatrixStore.resourceAssessments).toHaveBeenCalled();

    //   expect(mockStore.value[mockResourceName].length).toEqual(2);
    //   expect(componentDom.tableStore).toBeDefined();
    //   expect(componentDom.tableStore.records.length).toEqual(2);
    // });

    // test('And it renders a header row', async () => {
    //   const dom = await renderAndReturnDom(component, 'adaburrows-table');
    //   const elements = dom.window.document.querySelectorAll(`thead tr`);
    //   expect(elements.length).toBe(1);
    // });
    // test('And the header row has the correct number of columns ', async () => {
    //   const dom = await renderAndReturnDom(component, 'adaburrows-table');
    //   const elements = dom.window.document.querySelectorAll(`thead tr th`);
    //   expect(elements.length).toBe(4);
    // });
    // test('And the header row has the correct column headings ', async () => {
    //   const dom = await renderAndReturnDom(component, 'adaburrows-table');
    //   const elements = dom.window.document.querySelectorAll(`thead tr th`);
    //   expect([...elements].map((node) => node.textContent.trim())).eql([
    //     "Value",
    //     "Dimension",
    //     "Resource",
    //     "Author",
    //   ]);
    // });
  // });
  // describe('Given a MatrixStore with three resources and two assessments each resource', () => {
  //   beforeEach(async () => {
  //     mockStore = mockMatrixStore.resourceAssessments();
  //     mockStore.mockSetSubscribeValue(mockAssessments);
  //     toBeTestedSubComponent = componentDom.renderRoot.querySelector("#" + subComponentId);
  //   });

  // test(`Then state is initialized`, async () => {
  //   expect(mockMatrixStore.resourceAssessments).toHaveBeenCalled();

  //   expect(mockStore.value[mockResourceName].length).toEqual(2);
  //   expect(componentDom.tableStore).toBeDefined();
  //   expect(componentDom.tableStore.records.length).toEqual(2);
  // });

  // test('And it renders a header row', async () => {
  //   const dom = await renderAndReturnDom(component, 'adaburrows-table');
  //   const elements = dom.window.document.querySelectorAll(`thead tr`);
  //   expect(elements.length).toBe(1);
  // });
  // test('And the header row has the correct number of columns ', async () => {
  //   const dom = await renderAndReturnDom(component, 'adaburrows-table');
  //   const elements = dom.window.document.querySelectorAll(`thead tr th`);
  //   expect(elements.length).toBe(4);
  // });
  // test('And the header row has the correct column headings ', async () => {
  //   const dom = await renderAndReturnDom(component, 'adaburrows-table');
  //   const elements = dom.window.document.querySelectorAll(`thead tr th`);
  //   expect([...elements].map((node) => node.textContent.trim())).eql([
  //     "Value",
  //     "Dimension",
  //     "Resource",
  //     "Author",
  //   ]);
  // });
  // });
});
