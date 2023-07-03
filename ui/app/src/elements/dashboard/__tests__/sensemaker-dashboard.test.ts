// const { JSDOM } = require('jsdom');
// import '@webcomponents/scoped-custom-element-registry/scoped-custom-element-registry.min.js';
// import { fixture, html } from '@open-wc/testing';
// import { describe, expect, test, beforeAll, beforeEach } from 'vitest'

// import './test-harness';
// import { mockMatrixStore } from './test-harness';
// import '../sensemaker-dashboard';
// import { SensemakerDashboard } from '../sensemaker-dashboard';
// import { stateful } from './helpers';
// /**
// * @vitest-environment jsdom
// */

// export const mockResourceName = 'abc';

// describe('SensemakeDashboard', () => {
//   let component, harness, componentDom, toBeTestedSubComponent;
//   let subComponentId = '';
//   let mockStore;

//   const initialRender = async (testComponent) => {
//     harness = await stateful(component);
//     componentDom = harness.querySelector('sensemaker-dashboard');
//     await componentDom.updateComplete;
//   }
//   const renderAndReturnDom = async (testComponent, subComponent) => {
//     await initialRender(testComponent)
//     const root = componentDom.renderRoot;
//     if(!!subComponent) {
//       toBeTestedSubComponent = root.querySelector(subComponent);
//       return new JSDOM(toBeTestedSubComponent.renderRoot.innerHTML);
//     }
//     return new JSDOM(root.innerHTML);
//   }

//   beforeAll(async () => {
//     component = html`<sensemaker-dashboard></sensemaker-dashboard>`;
//     await initialRender(component)
//   });

//   describe('Given a MatrixStore with no applets ', () => {
//     beforeEach(async () => {
//       mockStore = mockMatrixStore._allAppletClasses;
//       mockStore.mockSetSubscribeValue({_values : {}});
//     });

//     test(`Then state is initialized`, async () => {
//       expect(Object.keys(mockStore.value._values).length).toEqual(0);

//       expect(componentDom._allAppletsStore).toBeDefined();
//       expect(componentDom._allAppletsStore.value).toEqual(0);
//     });

//     test('And it renders a menu with a search bar, a Neighbourhood sub-menu, a member management sub-menu AND a Sensemaker sub-menu', async () => {
//       // const dom = await renderAndReturnDom(component, false);
//       // const elements = dom.window.document.querySelectorAll(`table`);
//       // expect(elements.length).toBe(0);

//       // const p = dom.window.document.querySelectorAll(`p`);

//       // expect(p.length).toBe(1);
//       // expect(p[0].textContent).toBe('No assessments found');
//     });

//     test('And the Sensemaker sub-menu has no items', async () => {
//       // const dom = await renderAndReturnDom(component, false);
//       // const elements = dom.window.document.querySelectorAll(`table`);
//       // expect(elements.length).toBe(0);

//       // const p = dom.window.document.querySelectorAll(`p`);

//       // expect(p.length).toBe(1);
//       // expect(p[0].textContent).toBe('No assessments found');
//     });

//     // test('And the search bar has a placholder string "Search"', async () => {
//     //   // const dom = await renderAndReturnDom(component, false);
//     //   // const elements = dom.window.document.querySelectorAll(`table`);
//     //   // expect(elements.length).toBe(0);

//     //   // const p = dom.window.document.querySelectorAll(`p`);

//     //   // expect(p.length).toBe(1);
//     //   // expect(p[0].textContent).toBe('No assessments found');
//     // });

//     // test('And there exists a divider between each of the submenus', async () => {
//     //   // const dom = await renderAndReturnDom(component, false);
//     //   // const elements = dom.window.document.querySelectorAll(`table`);
//     //   // expect(elements.length).toBe(0);

//     //   // const p = dom.window.document.querySelectorAll(`p`);

//     //   // expect(p.length).toBe(1);
//     //   // expect(p[0].textContent).toBe('No assessments found');
//     // });

//     // test('And the Neighbourhoods sub-menu has two items', async () => {
//     //   // const dom = await renderAndReturnDom(component, false);
//     //   // const elements = dom.window.document.querySelectorAll(`table`);
//     //   // expect(elements.length).toBe(0);

//     //   // const p = dom.window.document.querySelectorAll(`p`);

//     //   // expect(p.length).toBe(1);
//     //   // expect(p[0].textContent).toBe('No assessments found');
//     // });

//     // test('And the Neighbourhoods sub-menu has the correct values', async () => {
//     //   // const dom = await renderAndReturnDom(component, false);
//     //   // const elements = dom.window.document.querySelectorAll(`table`);
//     //   // expect(elements.length).toBe(0);

//     //   // const p = dom.window.document.querySelectorAll(`p`);

//     //   // expect(p.length).toBe(1);
//     //   // expect(p[0].textContent).toBe('No assessments found');
//     // });

//     // test('And the Member Management sub-menu has two items', async () => {
//     //   // const dom = await renderAndReturnDom(component, false);
//     //   // const elements = dom.window.document.querySelectorAll(`table`);
//     //   // expect(elements.length).toBe(0);

//     //   // const p = dom.window.document.querySelectorAll(`p`);

//     //   // expect(p.length).toBe(1);
//     //   // expect(p[0].textContent).toBe('No assessments found');
//     // });

//     // test('And the Member Management sub-menu has the correct values', async () => {
//     //   // const dom = await renderAndReturnDom(component, false);
//     //   // const elements = dom.window.document.querySelectorAll(`table`);
//     //   // expect(elements.length).toBe(0);

//     //   // const p = dom.window.document.querySelectorAll(`p`);

//     //   // expect(p.length).toBe(1);
//     //   // expect(p[0].textContent).toBe('No assessments found');
//     // });
//   });

//   // describe('Given a MatrixStore one applet with no assessments ', () => {
//   //   beforeEach(async () => {
//   //     mockStore = mockMatrixStore.resourceAssessments();
//   //     mockStore.mockSetSubscribeValue({ 'abc': [] });
//   //   });

//   //   // test(`Then state is initialized`, async () => {
//   //   //   expect(mockMatrixStore.resourceAssessments).toHaveBeenCalled();

//   //   //   expect(mockStore.value[mockResourceName].length).toEqual(0);

//   //   //   expect(componentDom.tableStore).toBeDefined();
//   //   //   expect(componentDom.tableStore.records.length).toEqual(0);
//   //   // });

//   //   // test('And it renders no table but gives a message', async () => {
//   //   //   const dom = await renderAndReturnDom(component, false);
//   //   //   const elements = dom.window.document.querySelectorAll(`table`);
//   //   //   expect(elements.length).toBe(0);

//   //   //   const p = dom.window.document.querySelectorAll(`p`);

//   //   //   expect(p.length).toBe(1);
//   //   //   expect(p[0].textContent).toBe('No assessments found');
//   //   // });
//   // });

//   // describe('Given a MatrixStore with one resource and two assessments', () => {
//   //   beforeEach(async () => {
//   //     mockStore = mockMatrixStore.resourceAssessments();
//   //     mockStore.mockSetSubscribeValue(mockAssessments);
//   //     toBeTestedSubComponent = componentDom.renderRoot.querySelector("#" + subComponentId);
//   //   });

//   //   // test(`Then state is initialized`, async () => {
//   //   //   expect(mockMatrixStore.resourceAssessments).toHaveBeenCalled();

//   //   //   expect(mockStore.value[mockResourceName].length).toEqual(2);
//   //   //   expect(componentDom.tableStore).toBeDefined();
//   //   //   expect(componentDom.tableStore.records.length).toEqual(2);
//   //   // });

//   //   // test('And it renders a header row', async () => {
//   //   //   const dom = await renderAndReturnDom(component, 'adaburrows-table');
//   //   //   const elements = dom.window.document.querySelectorAll(`thead tr`);
//   //   //   expect(elements.length).toBe(1);
//   //   // });
//   //   // test('And the header row has the correct number of columns ', async () => {
//   //   //   const dom = await renderAndReturnDom(component, 'adaburrows-table');
//   //   //   const elements = dom.window.document.querySelectorAll(`thead tr th`);
//   //   //   expect(elements.length).toBe(4);
//   //   // });
//   //   // test('And the header row has the correct column headings ', async () => {
//   //   //   const dom = await renderAndReturnDom(component, 'adaburrows-table');
//   //   //   const elements = dom.window.document.querySelectorAll(`thead tr th`);
//   //   //   expect([...elements].map((node) => node.textContent.trim())).eql([
//   //   //     "Value",
//   //   //     "Dimension",
//   //   //     "Resource",
//   //   //     "Author",
//   //   //   ]);
//   //   // });
//   // });
//   // describe('Given a MatrixStore with three resources and two assessments each resource', () => {
//   //   beforeEach(async () => {
//   //     mockStore = mockMatrixStore.resourceAssessments();
//   //     mockStore.mockSetSubscribeValue(mockAssessments);
//   //     toBeTestedSubComponent = componentDom.renderRoot.querySelector("#" + subComponentId);
//   //   });

//   //   // test(`Then state is initialized`, async () => {
//   //   //   expect(mockMatrixStore.resourceAssessments).toHaveBeenCalled();

//   //   //   expect(mockStore.value[mockResourceName].length).toEqual(2);
//   //   //   expect(componentDom.tableStore).toBeDefined();
//   //   //   expect(componentDom.tableStore.records.length).toEqual(2);
//   //   // });

//   //   // test('And it renders a header row', async () => {
//   //   //   const dom = await renderAndReturnDom(component, 'adaburrows-table');
//   //   //   const elements = dom.window.document.querySelectorAll(`thead tr`);
//   //   //   expect(elements.length).toBe(1);
//   //   // });
//   //   // test('And the header row has the correct number of columns ', async () => {
//   //   //   const dom = await renderAndReturnDom(component, 'adaburrows-table');
//   //   //   const elements = dom.window.document.querySelectorAll(`thead tr th`);
//   //   //   expect(elements.length).toBe(4);
//   //   // });
//   //   // test('And the header row has the correct column headings ', async () => {
//   //   //   const dom = await renderAndReturnDom(component, 'adaburrows-table');
//   //   //   const elements = dom.window.document.querySelectorAll(`thead tr th`);
//   //   //   expect([...elements].map((node) => node.textContent.trim())).eql([
//   //   //     "Value",
//   //   //     "Dimension",
//   //   //     "Resource",
//   //   //     "Author",
//   //   //   ]);
//   //   // });
//   // });
// });