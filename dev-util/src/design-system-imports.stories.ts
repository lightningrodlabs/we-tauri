/**
 * Tests to assert functionality for various import formats of
 * the Design System Components.
 *
 * @package: Neighbourhoods Dev Util Components
 * @since:   2023-09-04
 */

import { NHButton } from '@neighbourhoods/design-system-components'
import NHButton_only from '@neighbourhoods/design-system-components/button'

import { html } from 'lit'
import type { Meta, StoryObj } from '@storybook/web-components'

// registering the elements is enough to test the validity of their class definitions
customElements.define('test-1', NHButton)
try {
  customElements.define('test-2', NHButton_only)
} catch (e) {
  // Multiple registration of the same class should be detected. Any other error is a real error.
  if (!(e instanceof DOMException && e.message.indexOf("constructor has already been used") !== -1)) {
    throw e
  }
}

interface Void {}

const meta: Meta<Void> = {
  title: 'NHDevUtil/DesignSystemImports',
  component: 'nh-assessment-widget',
  render: (args) => html`
    <p>[compiler-level test only] <test-1 /></p>
  `
};

export default meta;

type Story = StoryObj<CreatePostProps>;
export const Test: Story = {
  args: {},
};
