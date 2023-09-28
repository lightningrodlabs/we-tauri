import { b64images } from "@neighbourhoods/design-system-styles"; 
import NHButton from "./button";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";

customElements.define('nh-button', NHButton)

export interface ButtonProps {
  label: string;
  iconImageB64: string;
  disabled: boolean;
  theme: string;
  size: "stretch" | "lg" | "md" | "sm" | "icon";
  variant:
    | "primary"
    | "success"
    | "neutral"
    | "warning"
    | "danger";
}

const meta: Meta<ButtonProps> = {
  title: "NHComponent/Button",
  component: "nh-button",
  argTypes: {
    label: { control: "text" },
    iconImageB64: { control: "none" },
    theme: { control: "none" },
    disabled: { control: "none" },
    size: { options: ['stretch', 'lg', 'md', 'sm', 'icon'], control: { type: 'radio' }, },
    variant: { control: "none" },
  },
  render: (args) => html`<nh-button
    label=${args.label}
    iconImageB64=${args.iconImageB64}
    disabled=${args.disabled}
    theme=${args.theme}
    size=${args.size}
    variant=${args.variant}
  >
  </nh-button>`,
};

export default meta;

type Story = StoryObj<ButtonProps>;

export const Primary: Story = {
  args: {
    variant: "primary",
    label: "Save"
  },
};

export const Neutral: Story = {
  args: {
    variant: "neutral",
    label: "Save"
  },
};

export const Success: Story = {
  args: {
    variant: "success",
    label: "OK"
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    label: "Warning"
  },
};

export const Danger: Story = {
  args: {
    variant: "danger",
    label: "Danger"
  },
};

export const Icon: Story = {
  args: {
    variant: "neutral",
    label: "",
    iconImageB64: b64images.icons.backCaret,
    size: "icon",
  },
};