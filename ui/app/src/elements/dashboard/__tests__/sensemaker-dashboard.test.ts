const { JSDOM } = require('jsdom');
import '@webcomponents/scoped-custom-element-registry/scoped-custom-element-registry.min.js';
import { fixture, html } from '@open-wc/testing';
import { describe, expect, test, beforeAll, beforeEach, vi } from 'vitest';

import './matrix-test-harness';
import '../sensemaker-dashboard';
import { stateful } from './helpers';
import { getTagName } from './helpers';
import {
  mockAppletConfig,
  mockAppletConfigs,
} from '../../components/__tests__/sensemaker-store-test-harness';
import { MockFactory } from '../../__tests__/mock-factory';
import { DnaHash } from '@holochain/client';
import { get } from 'svelte/store';
import { AppletTuple } from './matrix-test-harness';
import { AppletConfig, SensemakerStore } from '@neighbourhoods/client';
import { cleanResourceNameForUI } from '../../components/helpers/functions';
import { flattenRoleAndZomeIndexedResourceDefs } from '../../../utils';

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
  let mockAppletConfigsResponse, mockFetchAppletsResponse, mockSensemakerResponse, mockProfilesResponse;

  const initialRender = async testComponent => {
    harness = await stateful(component, mockStore);
    componentDom = harness.querySelector(getTagName(testComponent));
    await componentDom.updateComplete;
  };
  const renderAndReturnDom = async (
    testComponent,
    subComponent,
    subComponent2 = '',
    subComponent3 = '',
  ) => {
    await initialRender(testComponent);
    const root = componentDom.renderRoot;
    if (!!subComponent) {
      toBeTestedSubComponent = root.querySelector(subComponent);
      // if(subComponent == 'dashboard-filter-map') {
      //   toBeTestedSubComponent.__tableType = 'resource';
      // }
      if (!!subComponent2) {
        // TODO: make this function recursive and extract to a helper function that lets you delve into x levels of webcomponent tree
        toBeTestedSubComponent = toBeTestedSubComponent.renderRoot.querySelector(subComponent2);
        if (!!subComponent3) {
          await toBeTestedSubComponent.updateComplete;
          toBeTestedSubComponent = toBeTestedSubComponent.renderRoot.querySelector(subComponent3);
          await toBeTestedSubComponent.updateComplete;
          return new JSDOM(toBeTestedSubComponent.renderRoot.innerHTML);
        }
        return new JSDOM(toBeTestedSubComponent.renderRoot.innerHTML);
      }
      return new JSDOM(toBeTestedSubComponent.renderRoot.innerHTML);
    }
    return new JSDOM(root.innerHTML);
  };

  beforeAll(async () => {
    mockAppletConfigsResponse = MockFactory.mockStoreResponse('appletConfigs').appletConfigs();
    mockFetchAppletsResponse = MockFactory.mockStoreResponse('getAppletInstanceInfosForGroup');
    mockSensemakerResponse = MockFactory.mockStoreResponse('matrix-sensemaker-for-we-group-id');
    mockProfilesResponse = MockFactory.mockStoreResponse('profiles');

    // Make a reusable mock store object that has constituent mock data streams as created by the MockFactory
    mockStore = {
      getAppletInstanceInfosForGroup: vi.fn(() => mockFetchAppletsResponse),
      sensemakerStore: vi.fn((weGroupId: DnaHash | undefined) => mockSensemakerResponse),
      profilesStore: vi.fn((weGroupId: DnaHash | undefined) => mockProfilesResponse),
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

  describe('Given a MatrixStore with 1 applet (AppletConfig has 2 resources) with 0 assessments in SM store', () => {
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

    test(`And the 1 Sensemaker sub-menu has 1 sub-nav below it`, async () => {
      const dom = await renderAndReturnDom(component, false);

      const elements = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) > sl-menu-item + .sub-nav`,
      );
      expect(elements.length).toBe(1);
    });

    test(`And the 1 sub-nav has as many nav items as there are Resource Definitions in the AppletConfig`, async () => {
      const dom = await renderAndReturnDom(component, false);

      const appletConfigs: { [appletInstanceId: string]: AppletConfig } =
        get(mockAppletConfigsResponse);
      const config = Object.values(appletConfigs)[0];

      const resourceDefsLength = Object.values(flattenRoleAndZomeIndexedResourceDefs(config.resource_defs)).length;
      const elements = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) > .sub-nav .nav-item`,
      );
      expect(elements.length).toBe(resourceDefsLength);
    });

    test(`And the 1 sub-nav item has the same text values as the Resource Definitions in the AppletConfig`, async () => {
      const dom = await renderAndReturnDom(component, false);

      const appletConfigs: { [appletInstanceId: string]: AppletConfig } =
        get(mockAppletConfigsResponse);
      const config = Object.values(appletConfigs)[0];

      const resourceDefNames = Object.keys(flattenRoleAndZomeIndexedResourceDefs(config.resource_defs));
      const elements = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) > .sub-nav .nav-item`,
      );
      expect([...elements].map(node => node.textContent.trim())).eql(
        resourceDefNames.map(name => cleanResourceNameForUI(name)),
      );
    });

    test('And it renders a table but with no rows', async () => {
      const dom = await renderAndReturnDom(component, 'dashboard-filter-map', 'dashboard-table', 'wc-table');
      await toBeTestedSubComponent.updateComplete;
      
      const tableElements = dom.window.document.querySelectorAll('table');
      expect(tableElements.length).toBe(1);

      const rowElements = dom.window.document.querySelectorAll('table tbody tr');
      expect(rowElements.length).toBe(0);
    });
  });

  describe('Given a MatrixStore with 2 applets (AppletConfigs each have 2 resources) with 0 assessments in SM store', () => {
    beforeAll(async () => {
      mockFetchAppletsResponse.mockSetSubscribeValue(MockFactory.createAppletInstanceInfos(2));
      mockSensemakerResponse.mockSetStoreAppConfigs(mockAppletConfigs);
      const mockSMStore: any = get(mockSensemakerResponse.store());
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
      const applets = (get(mockFetchAppletsResponse) as any).map(
        appletInstanceInfo => appletInstanceInfo.applet,
      );
      const appletNames = applets.map(applet => applet.customName);
      expect([...elements].map(node => node.textContent.trim())).eql(appletNames);
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
      const resourceDefsLengths = appletConfigs.map(
        config => Object.entries(flattenRoleAndZomeIndexedResourceDefs(config.resource_defs)).length,
      );

      const subnavs = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) > .sub-nav`,
      );
      const firstNavMenuItems = subnavs[0].querySelectorAll('.nav-item');
      const secondNavMenuItems = subnavs[1].querySelectorAll('.nav-item');
      expect(firstNavMenuItems.length).toBe(resourceDefsLengths[0]);
      expect(secondNavMenuItems.length).toBe(resourceDefsLengths[1]);
    });

    test(`And the 2 sub-navs each have the same text values as the Resource Definitions in the AppletConfigs`, async () => {
      const dom = await renderAndReturnDom(component, false);
      const appletConfigs: AppletConfig[] = Object.values(mockAppletConfigs);
      const resourceDefNames = appletConfigs.map(config => Object.keys(flattenRoleAndZomeIndexedResourceDefs(config.resource_defs)));

      const subnavs = dom.window.document.querySelectorAll(
        `.dashboard-menu-section:nth-of-type(2) > .sub-nav`,
      );
      const firstNavMenuItems = subnavs[0].querySelectorAll('.nav-item');
      const secondNavMenuItems = subnavs[1].querySelectorAll('.nav-item');
      expect([...firstNavMenuItems].map(node => node.textContent.trim())).eql(
        resourceDefNames[0].map(name => cleanResourceNameForUI(name)),
      );
      expect([...secondNavMenuItems].map(node => node.textContent.trim())).eql(
        resourceDefNames[1].map(name => cleanResourceNameForUI(name)),
      );
    });
  });

  describe('Given a MatrixStore with 1 applet (AppletConfig has 2 resources) and 2 assessments in SM store and 1  objective, 1 subjective dimension configured', () => {
    let objective, subjective, dimensions;
    beforeAll(async () => {
      mockFetchAppletsResponse.mockSetSubscribeValue(MockFactory.createAppletInstanceInfos(1));
      mockSensemakerResponse.mockSetStoreAppConfigs(mockAppletConfig);
      mockAppletConfigsResponse.mockSetSubscribeValue(mockAppletConfig);
      // mockProfilesResponse.mockSetSubscribeValue(MockFactory.mockStoreResponse('profiles-inner'))
      
      const mockSMStore: any = get(mockSensemakerResponse);
      subjective = MockFactory.createConfigDimensions(1, 'subjective');
      objective = MockFactory.createConfigDimensions(2, 'objective').slice(1);
      dimensions = [...objective, ...subjective];

      mockSMStore.setAppletConfigDimensions(dimensions);
      mockSMStore.setResourceAssessments(MockFactory.createAssessmentDict());
    });

    test(`Then state is initialized And TableType is set to Resource by default`, async () => {
      await renderAndReturnDom(component, 'dashboard-filter-map', 'dashboard-table');
      
      expect(toBeTestedSubComponent.tableStore).toBeDefined();
      // Since we only have one subjective dimension (resource view filters by this)
      expect(toBeTestedSubComponent.tableStore.records.length).toEqual(1);
      expect(toBeTestedSubComponent.__tableType).toBeDefined();
      expect(toBeTestedSubComponent.__tableType).toBe('resource');
    });

    test('And it renders a table', async () => {
      const dom = await renderAndReturnDom(
        component,
        'dashboard-filter-map',
        'dashboard-table',
        'wc-table',
      );

      const elements = dom.window.document.querySelectorAll(`table`);
      expect(elements.length).toBe(1);
    });

    test('And it renders a header row', async () => {
      const dom = await renderAndReturnDom(
        component,
        'dashboard-filter-map',
        'dashboard-table',
        'wc-table',
      );

      const elements = dom.window.document.querySelectorAll(`thead tr`);
      expect(elements.length).toBe(1);
    });
    test('And the header row has the correct number of columns for a Resource TableType', async () => {
      await renderAndReturnDom(
        component,
        'dashboard-filter-map',
        'dashboard-table',
        'wc-table',
      );
      const dom = new JSDOM(toBeTestedSubComponent.renderRoot.innerHTML);

      const elements = dom.window.document.querySelectorAll(`thead tr th`);
      expect(elements.length).toBe(3); // Two base columns plus one for the subjective assessment dimension
    });
    test('And the header row has the correct column headings for a Resource TableType', async () => {
      await renderAndReturnDom(
        component,
        'dashboard-filter-map',
        'dashboard-table',
        'wc-table',
      );
      const dom = new JSDOM(toBeTestedSubComponent.renderRoot.innerHTML);

      const h4s = dom.window.document.querySelectorAll(`thead tr th h4`);
      expect([...h4s].map(node => node.textContent.trim(). replace(/(\r\n|\n|\r)/gm, ""))).eql([
        'Resource',
        'Neighbour',
        'Assessment',
      ]);

      const h2s = dom.window.document.querySelectorAll(`thead tr th h2`);
      expect([...h2s].map(node => node.textContent.trim(). replace(/(\r\n|\n|\r)/gm, ""))).eql([
        'All Resources', // The resource name
        'Member',
        cleanResourceNameForUI(subjective[0].name)
      ]);
    });

    test('And it renders 1 row for the subjective dimension assessment', async () => {
      const dom = await renderAndReturnDom(component, 'dashboard-filter-map', 'dashboard-table', 'wc-table');

      const rowElements = dom.window.document.querySelectorAll('table tbody tr');
      expect(rowElements.length).toBe(1);
    });
  });
});