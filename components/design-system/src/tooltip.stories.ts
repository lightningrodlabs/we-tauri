import NHTooltip from "./tooltip";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";

customElements.define('nh-tooltip', NHTooltip)

export interface TooltipProps {
  text: string;
  visible: boolean;
}

const meta: Meta<TooltipProps> = {
  title: "NHComponent/Tooltip",
  component: "nh-tooltip",
  argTypes: {
  },
  render: (args) => html`<nh-tooltip
    .text=${args.text}
    .visible=${true}
  >
    <p slot="hoverable">Here is a long sentence:</p>
  </nh-tooltip>`,
};

export default meta;

type Story = StoryObj<TooltipProps>;

export const Default: Story = {
  args: {
    text: "Hello World",
  },
};
