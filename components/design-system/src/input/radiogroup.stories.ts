import NHRadioGroup from "./radiogroup";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";
import { NHTooltip } from "..";

customElements.define("nh-radio-group", NHRadioGroup);
!customElements.get("nh-tooltip") &&
  customElements.define("nh-tooltip", NHTooltip);

export interface RadioGroupProps {
  errored: boolean;
  required: boolean;
  size: "medium" | "large";
  direction: "horizontal" | "vertical";
}

const meta: Meta<RadioGroupProps> = {
  title: "NHComponent/Input/RadioGroup",
  component: "nh-radio-group",
  argTypes: {
    size: { options: ["medium", "large"], control: { type: "radio" } },
    direction: { options: ["horizontal", "vertical"], control: { type: "radio" } },
  },
  parameters: {
    backgrounds: { default: "surface" },
  },
  render: (args) => html`<nh-radio-group
    .required=${args.required}
    .errored=${args.errored}
    .size=${args.size}
    .direction=${args.direction}
  ></nh-radio-group>`,
};

export default meta;

type Story = StoryObj<RadioGroupProps>;

export const Default: Story = {
  args: {
    size: "medium",
    direction: "horizontal",
  },
};

const tooltipRender = (args: RadioGroupProps) => html`
  <nh-tooltip .visible=${true} .variant=${args.errored ? "danger" : "primary"} .text=${args.required && !args.errored ? "This is a required field" : args.required && args.errored ? "This field must be filled out" : "Some information"}>
    <nh-radio-group
      .required=${args.required}
      .errored=${args.errored}
      .size=${args.size}
      .direction=${args.direction}
      slot="hoverable"
    ></nh-radio-group>
  </nh-tooltip>
`;

export const WithTooltip: Story = {
  render: tooltipRender,
  args: {
    required: false,
    errored: false,
    size: "medium",
    direction: "horizontal",
  },
};

export const WithTooltipReqd: Story = {
  render: tooltipRender,
  args: {
    required: true,
    errored: false,
    size: "medium",
    direction: "horizontal",
  },
};

export const RequiredErrored: Story = {
  render: tooltipRender,
  args: {
    required: true,
    errored: true,
    size: "medium",
    direction: "horizontal",
  },
};
