import { AssessmentDict } from '../helpers/types';
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { contextProvider} from '@lit-labs/context';
import { AppletConfig } from '@neighbourhoods/client';
import { MockFactory } from '../../__tests__/mock-factory';
import { mockContext } from './helpers';

export const mockAssessments: AssessmentDict = MockFactory.createAssessmentDict();
export const mockAppletConfigs : {[appletInstanceId: string] : AppletConfig} = MockFactory.createAppletConfigDict();
export const mockFieldDefsResourceTable = MockFactory.createFieldDefsResourceTable();

@customElement('sensemaker-store-test-harness')
export class TestHarness extends LitElement {
  /**
   * Providing a context at the root element to maintain application state
   */
  @contextProvider({ context: mockContext })
  @property({attribute: false})
  // Create a mock store with the mock data
  _sensemakerStore: Object = MockFactory.mockStoreResponse('all')

  render() {
    return html`<slot></slot>`;
  }  
}
