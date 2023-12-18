import NHSelect from "./select";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";

customElements.define('nh-select', NHSelect)

export interface SelectProps {
  text: string;
  visible: boolean;
}

const meta: Meta<SelectProps> = {
  title: "NHComponent/Select",
  component: "nh-select",
  argTypes: {
  },
  render: (args) => html`<nh-select
    .text=${args.text}
    .visible=${true}
  >
  
  </nh-select>`,
};

export default meta;

type Story = StoryObj<SelectProps>;

export const Default: Story = {
  args: {
    text: "Hello World",
  },
};

export const Long: Story = {
  args: {
    text: "Did you know that you just did something that needed us to tell you something?",
  },
};