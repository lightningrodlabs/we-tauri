import NHTextInput from "./text";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";
import { NHTooltip } from "..";

customElements.define("nh-text-input", NHTextInput);
!customElements.get("nh-tooltip") &&
  customElements.define("nh-tooltip", NHTooltip);

export interface TextInputProps {
  placeholder: string;
  errored: boolean;
  required: boolean;
}

const meta: Meta<TextInputProps> = {
  title: "NHComponent/Input/TextInput",
  component: "nh-text-input",
  argTypes: {
    placeholder: { control: "text" },
  },
  parameters: {
    backgrounds: { default: "surface" },
  },
  render: (args) => html`<nh-text-input
    .placeholder=${args.placeholder}
    .required=${args.required}
    .errored=${args.errored}
  ></nh-text-input>`,
};

export default meta;

type Story = StoryObj<TextInputProps>;

export const Default: Story = {
  args: {
    placeholder: "Type here",
  },
};

const tooltipRender = (args: TextInputProps) => html`
  <nh-tooltip .visible=${true} .variant=${args.errored ? "danger" : "primary"} .text=${args.required && !args.errored ? "This is a required field" : args.required && args.errored ? "This field must be filled out" : "Some information"}>
    <nh-text-input
      .required=${args.required}
      .errored=${args.errored}
      .placeholder=${args.placeholder}
      slot="hoverable"
    ></nh-text-input>
  </nh-tooltip>
`;

export const WithTooltip: Story = {
  render: tooltipRender,
  args: {
    placeholder: "Type here",
    required: false,
    errored: false,
  },
};

export const WithTooltipReqd: Story = {
  render: tooltipRender,
  args: {
    placeholder: "Type here",
    required: true,
    errored: false,
  },
};

export const RequiredErrored: Story = {
  render: tooltipRender,
  args: {
    placeholder: "Type here",
    required: true,
    errored: true,
  },
};
