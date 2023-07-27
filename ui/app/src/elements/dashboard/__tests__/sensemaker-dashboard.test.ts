const { JSDOM } = require('jsdom');
import '@webcomponents/scoped-custom-element-registry/scoped-custom-element-registry.min.js';
import { fixture, html } from '@open-wc/testing';
import { describe, expect, test, beforeAll, beforeEach, vi } from 'vitest';

import './matrix-test-harness';
import '../sensemaker-dashboard';
import { stateful } from './helpers';
import { getTagName } from './helpers';
import { mockAppletConfig, mockAppletConfigs } from '../../components/__tests__/sensemaker-store-test-harness';
import { MockFactory } from '../../__tests__/mock-factory';
import { DnaHash } from '@holochain/client';
import { get } from 'svelte/store';
import { AppletTuple } from './matrix-test-harness';
import { AppletConfig, SensemakerStore } from '@neighbourhoods/client';
import { cleanResourceNameForUI } from '../../components/helpers/functions';

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
  let mockAppletConfigsResponse, mockFetchAppletsResponse, mockSensemakerResponse;

  const initialRender = async testComponent => {
    harness = await stateful(component, mockStore);
    componentDom = harness.querySelector(getTagName(testComponent));
    await componentDom.updateComplete;
  };
  const renderAndReturnDom = async (testComponent, subComponent, subComponent2 = '') => {
    await initialRender(testComponent);
    const root = componentDom.renderRoot;
    if (!!subComponent) {
      toBeTestedSubComponent = root.querySelector(subComponent);
      if (!!subComponent2) {
        // TODO: make this function recursive and extract to a helper function that lets you delve into x levels of webcomponent tree
        componentDom = toBeTestedSubComponent.renderRoot.querySelector(subComponent2);
        return new JSDOM(componentDom.renderRoot.innerHTML)
      }
      return new JSDOM(toBeTestedSubComponent.renderRoot.innerHTML);
    }
    return new JSDOM(root.innerHTML);
  };

  beforeAll(async () => {
    mockAppletConfigsResponse = MockFactory.mockStoreResponse('appletConfigs').appletConfigs();
    mockFetchAppletsResponse = MockFactory.mockStoreResponse('getAppletInstanceInfosForGroup');
    mockSensemakerResponse = MockFactory.mockStoreResponse('matrix-sensemaker-for-we-group-id');

    mockStore = {
      getAppletInstanceInfosForGroup: vi.fn(() => mockFetchAppletsResponse),
      sensemakerStore: vi.fn((weGroupId: DnaHash | undefined) => mockSensemakerResponse),
    };

    component = html`<sensemaker-dashboard></sensemaker-dashboard>`;
    await initialRender(component);
  });

  describe('Given a MatrixStore with no applets ', () => {
    beforeEach(async () => {
      mockFetchAppletsResponse.mockSetSubscribeValue(MockFactory.createAppletInstanceInfos(0));
    });

    test(`Then it renders a menu with a search bar, a Neighbourhood sub-menu, a member management sub-menu AND a Sensemaker sub-menu`, async () => {
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

  describe('Given a MatrixStore with an applet (AppletConfig has two resources) with no assessments in SM store', () => {
    beforeAll(async () => {
      mockFetchAppletsResponse.mockSetSubscribeValue(MockFactory.createAppletInstanceInfos(1));
      mockSensemakerResponse.mockSetStoreAppConfigs(mockAppletConfig);
      mockAppletConfigsResponse.mockSetSubscribeValue(mockAppletConfig);
    });

    test(`Then the Sensemaker sub-menu has 1 item`, async () => {
      const dom = await renderAndReturnDom(component, false);
      const elements = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) > sl-menu-item`,
      );
      expect(elements.length).toBe(1);
    });

    test(`And the 1 Sensemaker sub-menu item has an active state`, async () => {
      const dom = await renderAndReturnDom(component, false);

      const elements = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) > sl-menu-item.active`,
      );
      expect(elements.length).toBe(1);
    });

    test(`And the 1 Sensemaker sub-menu item has the same text value as the Applet name`, async () => {
      const dom = await renderAndReturnDom(component, false);

      const elements = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) > sl-menu-item.active`,
      );

      const applet = (get(mockFetchAppletsResponse) as any)![0].applet;
      expect(elements[0].textContent).toBe(applet.customName);
    });

    test(`And the 1 Sensemaker sub-menu has 1 sub-nav below`, async () => {
      const dom = await renderAndReturnDom(component, false);

      const elements = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) > sl-menu-item + .sub-nav`,
      );
      expect(elements.length).toBe(1);
    });

    test(`And the 1 sub-nav has as many nav items as there are Resource Definitions in the AppletConfig`, async () => {
      const dom = await renderAndReturnDom(component, false);
      const appletConfigs: {[appletInstanceId: string] : AppletConfig} = get(mockAppletConfigsResponse);
      const config = Object.values(appletConfigs)[0];
      const resourceDefsLength = Object.values(config.resource_defs).length;
      const elements = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) > .sub-nav .nav-item`,
      );
      expect(elements.length).toBe(resourceDefsLength);
    });

    test(`And the 1 sub-nav item has the same text values as the Resource Definitions in the AppletConfig`, async () => {
      const dom = await renderAndReturnDom(component, false);
      const appletConfigs: {[appletInstanceId: string] : AppletConfig} = get(mockAppletConfigsResponse);
      const config = Object.values(appletConfigs)[0];
      const resourceDefNames = Object.keys(config.resource_defs);

      const elements = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) > .sub-nav .nav-item`,
      );
      expect([...elements].map(node => node.textContent.trim())).eql(
        resourceDefNames.map(name => cleanResourceNameForUI(name)),
      );
    });

    test('And it renders no table but instead a skeleton', async () => {
      const dom = await renderAndReturnDom(component, 'dashboard-filter-map', 'dashboard-table');
      
      const elements = dom.window.document.querySelector('table');
      expect(elements).toBeNull();

      const skeleton = dom.window.document.querySelectorAll(`.skeleton-main-container`);
      expect(skeleton.length).toBe(1);
    });
  });

  describe('Given a MatrixStore with an applet (AppletConfig has two resources) and two assessments in SM store', () => {
  beforeAll(async () => {
    mockFetchAppletsResponse.mockSetSubscribeValue(MockFactory.createAppletInstanceInfos(1));
    mockSensemakerResponse.mockSetStoreAppConfigs(mockAppletConfig);
    mockAppletConfigsResponse.mockSetSubscribeValue(mockAppletConfig);

    const mockSMStore : any = get(mockSensemakerResponse);
    mockSMStore.setResourceAssessments(MockFactory.createAssessmentDict());

    // const a : any = (get(mockSensemakerResponse) as any).resourceAssessments();
  });

  test(`Then state is initialized`, async () => {
    let mockSMStore = get(mockSensemakerResponse) as any;
    expect((mockSMStore).resourceAssessments).toHaveBeenCalled();

    expect(mockSMStore.resourceAssessments().value['abc'].length).toEqual(2);
    
    await renderAndReturnDom(component, 'dashboard-filter-map', 'dashboard-table');
    expect(componentDom.tableStore).toBeDefined();
    expect(componentDom.tableStore.records.length).toEqual(2);
  });

  test('And it renders a header row', async () => {
    const dom = await renderAndReturnDom(component, 'adaburrows-table');
    const elements = dom.window.document.querySelectorAll(`thead tr`);
    expect(elements.length).toBe(1);
  });
  test('And the header row has the correct number of columns ', async () => {
    const dom = await renderAndReturnDom(component, 'adaburrows-table');
    const elements = dom.window.document.querySelectorAll(`thead tr th`);
    expect(elements.length).toBe(4);
  });
  test('And the header row has the correct column headings ', async () => {
    const dom = await renderAndReturnDom(component, 'adaburrows-table');
    const elements = dom.window.document.querySelectorAll(`thead tr th`);
    expect([...elements].map((node) => node.textContent.trim())).eql([
      "Value",
      "Dimension",
      "Resource",
      "Author",
    ]);
  });
  });
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

  describe('Given a MatrixStore with 2 applets (AppletConfigs each have one resource) with no assessments in SM store', () => {
    beforeAll(async () => {
      mockFetchAppletsResponse.mockSetSubscribeValue(MockFactory.createAppletInstanceInfos(2));
      mockSensemakerResponse.mockSetStoreAppConfigs(mockAppletConfigs);
      const mockSMStore : any = get(mockSensemakerResponse.store());
      mockSMStore.setAppletConfigs(mockAppletConfigs);
      
    });

    test(`Then the Sensemaker sub-menu has 2 items`, async () => {
      const dom = await renderAndReturnDom(component, false);
      
      const elements = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) > sl-menu-item`,
      );
      expect(elements.length).toBe(2);
    });

    test(`And of the 2 Sensemaker sub-menu items, only the first has an active state`, async () => {
      const dom = await renderAndReturnDom(component, false);

      const menuItems = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) > sl-menu-item`,
      );
      expect(menuItems[0].classList.contains('active')).toBe(true);
      expect(menuItems[1].classList.contains('active')).toBe(false);
    });

    test(`And the 2 Sensemaker sub-menu items have the same text values as the Applet names`, async () => {
      const dom = await renderAndReturnDom(component, false);

      const elements = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) > sl-menu-item`,
      );
      const applets = (get(mockFetchAppletsResponse) as any).map(appletInstanceInfo => appletInstanceInfo.applet);
      const appletNames = applets.map(applet => applet.customName);
          expect([...elements].map((node) => node.textContent.trim())).eql(appletNames);
    });

    test(`And the 2 Sensemaker sub-menus each have 1 sub-nav below`, async () => {
      const dom = await renderAndReturnDom(component, false);

      const elements = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) >  sl-menu-item + .sub-nav`,
      );
      expect(elements.length).toBe(2);
    });

    test(`And the 2 sub-navs each have as many nav items as there are Resource Definitions in the AppletConfigs`, async () => {
      const dom = await renderAndReturnDom(component, false);
      const appletConfigs: AppletConfig[] = Object.values(mockAppletConfigs).flat();
      const resourceDefsLengths = appletConfigs.map(config => Object.entries(config.resource_defs).length);

      const subnavs = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) > .sub-nav`,
      );
      const firstNavMenuItems = subnavs[0].querySelectorAll(".nav-item");
      const secondNavMenuItems = subnavs[1].querySelectorAll(".nav-item");
      expect(firstNavMenuItems.length).toBe(resourceDefsLengths[0]);
      expect(secondNavMenuItems.length).toBe(resourceDefsLengths[1]);
    });

    test(`And the 2 sub-navs each have the same text values as the Resource Definitions in the AppletConfigs`, async () => {
      const dom = await renderAndReturnDom(component, false);
      const appletConfigs: AppletConfig[] = Object.values(mockAppletConfigs);
      const resourceDefNames = appletConfigs.map(config => Object.keys(config.resource_defs));

      const subnavs = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) > .sub-nav`,
      );
      const firstNavMenuItems = subnavs[0].querySelectorAll(".nav-item");
      const secondNavMenuItems = subnavs[1].querySelectorAll(".nav-item");
      expect([...firstNavMenuItems].map(node => node.textContent.trim())).eql(
        resourceDefNames[0].map(name => cleanResourceNameForUI(name)),
      );
      expect([...secondNavMenuItems].map(node => node.textContent.trim())).eql(
        resourceDefNames[1].map(name => cleanResourceNameForUI(name)),
      );
    });
  });
});
