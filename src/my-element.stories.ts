import { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'

import './my-element'

export default {
  title: 'My Element',
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    onOpen: { action: 'onClick' },
  },
  render: (args) => html`<my-element @click=${args.onOpen} name=${args.name}></my-element>`,
} as Meta

export const Default: StoryObj = {
  name: 'Default',
  args: {
    name: 'Lit',
  },
}
