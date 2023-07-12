const { JSDOM } = require('jsdom');
import '@webcomponents/scoped-custom-element-registry/scoped-custom-element-registry.min.js';
import { fixture, html } from '@open-wc/testing';
import { describe, expect, test, beforeAll, beforeEach } from 'vitest'

import './matrix-test-harness';
import '../sensemaker-dashboard';
import { stateful } from '../../components/__tests__/helpers';
import { AppletTuple, mockApplets, mockMatrixStore, testAppletName } from './matrix-test-harness';
import { get } from 'svelte/store';
import { getTagName } from './helpers';
import { mockAppletConfig, mockAppletConfigResponse } from '../../components/__tests__/sensemaker-test-harness';
/**
* @vitest-environment jsdom
*/


describe('SensemakerDashboard', () => {
  let component, harness, componentDom, toBeTestedSubComponent;
  let mockAppletsStream;

  const initialRender = async (testComponent) => {
    harness = await stateful(component);
    componentDom = harness.querySelector(getTagName(testComponent));
    await componentDom.updateComplete;
  }
  const renderAndReturnDom = async (testComponent, subComponent) => {
    await initialRender(testComponent)
    const root = componentDom.renderRoot;
    if(!!subComponent) {
      toBeTestedSubComponent = root.querySelector(subComponent);
      return new JSDOM(toBeTestedSubComponent.renderRoot.innerHTML);
    }
    return new JSDOM(root.innerHTML);
  }

  beforeAll(async () => {
    component = html`<sensemaker-dashboard></sensemaker-dashboard>`;
    await initialRender(component)
  });

  describe('Given a MatrixStore with no applets ', () => {
    beforeEach(async () => {
      mockAppletsStream = mockMatrixStore.fetchAllApplets();
      mockAppletsStream.mockSetSubscribeValue([]);
    });

    test(`Then state is initialized`, async () => {
      const storeValue : AppletTuple[] = get(mockAppletsStream.store());
      expect(storeValue.length).toEqual(0);
    });

    test(`And state can be altered by adding an applet`, async () => {
      mockAppletsStream.mockSetSubscribeValue(mockApplets);
      const storeValue : AppletTuple[] = get(mockAppletsStream.store());
      expect(storeValue.length).toEqual(1);
    });

    test('And it renders a menu with a search bar, a Neighbourhood sub-menu, a member management sub-menu AND a Sensemaker sub-menu', async () => {
      mockAppletConfigResponse.mockSetSubscribeValue(mockAppletConfig);
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

    test('And the Sensemaker sub-menu has no items', async () => {
      mockAppletConfigResponse.mockSetSubscribeValue(mockAppletConfig);
      const dom = await renderAndReturnDom(component, false);

      const elements = dom.window.document.querySelectorAll(`.dashboard-menu-section:nth-of-type(2) .nav-item`);
      expect(elements.length).toBe(0);
    });

    test('And the Neighbourhoods sub-menu has two items', async () => {
      mockAppletConfigResponse.mockSetSubscribeValue(mockAppletConfig);
      const dom = await renderAndReturnDom(component, false);

      const elements = dom.window.document.querySelectorAll(`.dashboard-menu-section:nth-of-type(3) .nav-item`);
      expect(elements.length).toBe(2);
    });
  });

  // describe('Given a MatrixStore one applet with no assessments ', () => {
  //   beforeEach(async () => {
  //     mockStore = mockMatrixStore.resourceAssessments();
  //     mockStore.mockSetSubscribeValue({ 'abc': [] });
  //   });

  //   // test(`Then state is initialized`, async () => {
  //   //   expect(mockMatrixStore.resourceAssessments).toHaveBeenCalled();

  //   //   expect(mockStore.value[mockResourceName].length).toEqual(0);

  //   //   expect(componentDom.tableStore).toBeDefined();
  //   //   expect(componentDom.tableStore.records.length).toEqual(0);
  //   // });

  //   // test('And it renders no table but gives a message', async () => {
  //   //   const dom = await renderAndReturnDom(component, false);
  //   //   const elements = dom.window.document.querySelectorAll(`table`);
  //   //   expect(elements.length).toBe(0);

  //   //   const p = dom.window.document.querySelectorAll(`p`);

  //   //   expect(p.length).toBe(1);
  //   //   expect(p[0].textContent).toBe('No assessments found');
  //   // });
  // });

  // describe('Given a MatrixStore with one resource and two assessments', () => {
  //   beforeEach(async () => {
  //     mockStore = mockMatrixStore.resourceAssessments();
  //     mockStore.mockSetSubscribeValue(mockAssessments);
  //     toBeTestedSubComponent = componentDom.renderRoot.querySelector("#" + subComponentId);
  //   });

  //   // test(`Then state is initialized`, async () => {
  //   //   expect(mockMatrixStore.resourceAssessments).toHaveBeenCalled();

  //   //   expect(mockStore.value[mockResourceName].length).toEqual(2);
  //   //   expect(componentDom.tableStore).toBeDefined();
  //   //   expect(componentDom.tableStore.records.length).toEqual(2);
  //   // });

  //   // test('And it renders a header row', async () => {
  //   //   const dom = await renderAndReturnDom(component, 'adaburrows-table');
  //   //   const elements = dom.window.document.querySelectorAll(`thead tr`);
  //   //   expect(elements.length).toBe(1);
  //   // });
  //   // test('And the header row has the correct number of columns ', async () => {
  //   //   const dom = await renderAndReturnDom(component, 'adaburrows-table');
  //   //   const elements = dom.window.document.querySelectorAll(`thead tr th`);
  //   //   expect(elements.length).toBe(4);
  //   // });
  //   // test('And the header row has the correct column headings ', async () => {
  //   //   const dom = await renderAndReturnDom(component, 'adaburrows-table');
  //   //   const elements = dom.window.document.querySelectorAll(`thead tr th`);
  //   //   expect([...elements].map((node) => node.textContent.trim())).eql([
  //   //     "Value",
  //   //     "Dimension",
  //   //     "Resource",
  //   //     "Author",
  //   //   ]);
  //   // });
  // });
  // describe('Given a MatrixStore with three resources and two assessments each resource', () => {
  //   beforeEach(async () => {
  //     mockStore = mockMatrixStore.resourceAssessments();
  //     mockStore.mockSetSubscribeValue(mockAssessments);
  //     toBeTestedSubComponent = componentDom.renderRoot.querySelector("#" + subComponentId);
  //   });

  //   // test(`Then state is initialized`, async () => {
  //   //   expect(mockMatrixStore.resourceAssessments).toHaveBeenCalled();

  //   //   expect(mockStore.value[mockResourceName].length).toEqual(2);
  //   //   expect(componentDom.tableStore).toBeDefined();
  //   //   expect(componentDom.tableStore.records.length).toEqual(2);
  //   // });

  //   // test('And it renders a header row', async () => {
  //   //   const dom = await renderAndReturnDom(component, 'adaburrows-table');
  //   //   const elements = dom.window.document.querySelectorAll(`thead tr`);
  //   //   expect(elements.length).toBe(1);
  //   // });
  //   // test('And the header row has the correct number of columns ', async () => {
  //   //   const dom = await renderAndReturnDom(component, 'adaburrows-table');
  //   //   const elements = dom.window.document.querySelectorAll(`thead tr th`);
  //   //   expect(elements.length).toBe(4);
  //   // });
  //   // test('And the header row has the correct column headings ', async () => {
  //   //   const dom = await renderAndReturnDom(component, 'adaburrows-table');
  //   //   const elements = dom.window.document.querySelectorAll(`thead tr th`);
  //   //   expect([...elements].map((node) => node.textContent.trim())).eql([
  //   //     "Value",
  //   //     "Dimension",
  //   //     "Resource",
  //   //     "Author",
  //   //   ]);
  //   // });
  // });
});