import { html } from 'lit'
import type { Meta, StoryObj } from '@storybook/web-components'
import { within } from 'shadow-dom-testing-library'
import { userEvent } from '@storybook/testing-library'
import { expect, jest } from '@storybook/jest'

import CreateOrJoinNH from './create-or-join-nh'

customElements.define('create-or-join-nh', CreateOrJoinNH)

interface Void {}

const meta: Meta<Void> = {
  title: 'NHDevUtil/CreateOrJoinNH',
  component: 'create-or-join-nh',
};

export default meta;

type Story = StoryObj<Void>
export const Render: Story = {
  args: {},
}

const createListener = jest.fn()
export const CreateNH: Story = html`<create-or-join-nh @create-nh=${createListener}></create-or-join-nh>`
CreateNH.parameters = { ...meta.parameters }
CreateNH.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement)

  await userEvent.click(canvas.getByShadowRole('button', { name: /create/i }))

  expect(createListener).toHaveBeenCalledTimes(1)
  expect(createListener).toHaveBeenCalledWith(new CustomEvent('create-nh'))
}

const joinListener = jest.fn()
export const JoinNH: Story = html`<create-or-join-nh @join-nh=${joinListener}></create-or-join-nh>`
JoinNH.parameters = { ...meta.parameters }
JoinNH.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement)

  const pubkey = 'test_pubkey_shouldreallyfailcositsinvalid'

  await userEvent.type(canvas.getByShadowRole('textbox'), pubkey)
  await userEvent.click(canvas.getByShadowRole('button', { name: /join/i }))

  expect(createListener).toHaveBeenCalledTimes(1)
  expect(createListener).toHaveBeenCalledWith(new CustomEvent('join-nh', {
      detail: { newValue: pubkey },
      bubbles: true,
      composed: true
  }))
}

// :TODO: test invalid pubkey entry
