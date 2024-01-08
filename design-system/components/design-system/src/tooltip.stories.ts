import NHTooltip from "./tooltip";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";

!customElements.get('nh-tooltip') && customElements.define('nh-tooltip', NHTooltip)

export interface TooltipProps {
  text: string;
  visible: boolean;
  variant:
  | "primary"
  | "secondary"
  | "success"
  | "neutral"
  | "warning"
  | "danger";
}

const meta: Meta<TooltipProps> = {
  title: "NHComponent/Tooltip",
  component: "nh-tooltip",
  argTypes: {
    variant: { options: ['primary', 'neutral', 'success', 'warning', 'danger'], control: { type: 'radio' }, },
  },
  render: (args) => html`<nh-tooltip
    .text=${args.text}
    .variant=${args.variant}
    .visible=${true}
  >
    <span style="background: white; padding: 1rem;" slot="hoverable">Here is a long sentence:</span>
  </nh-tooltip>`,
};

export default meta;

type Story = StoryObj<TooltipProps>;

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


export const Primary: Story = {
  args: {
    text: "Did you know that you just did something that needed us to tell you something?",
    variant: "primary"
  },
};


export const Success: Story = {
  args: {
    text: "Did you know that you just did something that needed us to tell you something?",
    variant: "success"
  },
};


export const Danger: Story = {
  args: {
    text: "Did you know that you just did something that needed us to tell you something?",
    variant: "danger"
  },
};


export const Warning: Story = {
  args: {
    text: "Did you know that you just did something that needed us to tell you something?",
    variant: "warning"
  },
};
