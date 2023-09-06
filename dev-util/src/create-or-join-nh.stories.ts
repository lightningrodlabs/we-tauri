import CreateOrJoinNH from './create-or-join-nh'

import { html } from 'lit'
import type { Meta, StoryObj } from '@storybook/web-components'

customElements.define('create-or-join-nh', CreateOrJoinNH)

interface Void {}

const meta: Meta<Void> = {
  title: 'NHDevUtil/CreateOrJoinNH',
  component: 'create-or-join-nh',
};

export default meta;

type Story = StoryObj<Void>;
export const Test: Story = {
  args: {},
};
