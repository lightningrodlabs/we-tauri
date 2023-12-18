import NHForm from "./test";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";

customElements.define('nh-form', NHForm)

export interface FormProps {
}

const meta: Meta<FormProps> = {
  title: "NHComponent/Form",
  component: "nh-form",
  argTypes: {
  },
  parameters: { 
    backgrounds: { default: 'surface' },
  },
  render: (_args) => html`<nh-form></nh-form>`,
};

export default meta;

type Story = StoryObj<FormProps>;

export const Default: Story = {
  args: {
  },
};