import NHSelect, { OptionConfig } from "./select";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";
import { NHTooltip } from "..";

customElements.define('nh-select', NHSelect)
!customElements.get('nh-tooltip') && customElements.define('nh-tooltip', NHTooltip)

export interface SelectProps {
  options: OptionConfig[];
  placeholder: string;
  size: "medium" | "large";
}

const meta: Meta<SelectProps> = {
  title: "NHComponent/Input/Select",
  component: "nh-select",
  argTypes: {
    placeholder: { control: "text" },
    size: { options: ["medium", "large"], control: { type: "radio" } },
  },
  parameters: { 
    backgrounds: { default: 'surface' },
  },
  render: (args) => html`<nh-select
    .options=${args.options}
    .placeholder=${args.placeholder}
    .size=${args.size}
  >${args.placeholder}</nh-select>`,
};

export default meta;

type Story = StoryObj<SelectProps>;

export const Default: Story = {
  args: {
    placeholder: "Select dimension:",
    size: "medium",
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

export const WithTooltip: Story = {
  render: (args) => html` <nh-tooltip .visible=${true} .variant=${"primary"} .text=${"Info about your field"}>
    <nh-select
    slot="hoverable"
    .options=${args.options}
    .placeholder=${args.placeholder}
    .size=${args.size}
    >${args.placeholder}</nh-select>
  </nh-tooltip>
  `,
  args: {
    placeholder: "Please select something:",
    size: "medium",
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
    ],
  },
};
export const RequiredUntouched: Story = {
  render: (args) => html` <nh-tooltip .visible=${true} .variant=${"danger"} .text=${"This is a required field."}>
    <nh-select
    ?required=${true}
    class="untouched"
    slot="hoverable"
    .options=${args.options}
    .placeholder=${args.placeholder}
    .size=${args.size}
    >${args.placeholder}</nh-select>
  </nh-tooltip>
  `,
  args: {
    placeholder: "Please select something:",
    size: "medium",
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
    ],
  },
};