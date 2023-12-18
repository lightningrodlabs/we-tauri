import NHSelect, { OptionConfig } from "./select";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";

customElements.define('nh-select', NHSelect)

export interface SelectProps {
  options: OptionConfig[];
  placeholder: string;
}

const meta: Meta<SelectProps> = {
  title: "NHComponent/Select",
  component: "nh-select",
  argTypes: {
    placeholder: { control: "text" }
  
  },
  render: (args) => html`<nh-select
    .options=${args.options}
  >${args.placeholder}</nh-select>`,
};

export default meta;

type Story = StoryObj<SelectProps>;

export const Default: Story = {
  args: {
    placeholder: "Select dimension:",
    options: [
      {
        label: "One",
        value: "1"
      },
      {
        label: "Two",
        value: "2"
      },
      {
        label: "Three",
        value: "3"
      },
      {
        label: "Four",
        value: "4"
      },
      {
        label: "Five",
        value: "5"
      },
    ]
  },
};

export const Long: Story = {
  args: {
    placeholder: "Please select something:",
    options: [
      {
        label: "One",
        value: "1"
      },
      {
        label: "Two",
        value: "2"
      },
      {
        label: "Three",
        value: "3"
      },
      {
        label: "Four",
        value: "4"
      },
      {
        label: "Five",
        value: "5"
      },
    ]
  },
};