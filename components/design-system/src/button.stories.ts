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
  size: "auto" | "lg" | "md" | "sm" | "icon"| "icon-label"| "icon-sm";
  variant:
    | "primary"
    | "secondary"
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
    iconImageB64: { control: false },
    theme: { control: false },
    disabled: { control: 'boolean' },
    size: { control: false },
    variant: { options: ['primary', 'secondary', 'neutral', 'success', 'warning', 'danger'], control: { type: 'radio' }, },
  },
  render: (args) => html`<nh-button
    .label=${args.label}
    .iconImageB64=${args.iconImageB64}
    .theme=${args.theme}
    .size=${args.size}
    .disabled=${args.disabled}
    .variant=${args.variant}
  >
  </nh-button>`,
};

export default meta;

type Story = StoryObj<ButtonProps>;

const variantParams = {
    controls: {
      exclude:/variant|iconImageB64|theme|size/g
    }
};
const sizeParams = {
    controls: {
      exclude:/size|iconImageB64|theme|size/g
    }
};

// Variants

export const Primary: Story = {
  args: {
    variant: "primary",
    label: "Save",
  },
  parameters: variantParams
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    label: "Help"
  },
  parameters: variantParams
};

export const Neutral: Story = {
  args: {
    variant: "neutral",
    label: "Save"
  },
  parameters: variantParams
};

export const Success: Story = {
  args: {
    variant: "success",
    label: "OK"
  },
  parameters: variantParams
};

export const Warning: Story = {
  args: {
    variant: "warning",
    label: "Reinstall"
  },
  parameters: variantParams
};

export const Danger: Story = {
  args: {
    variant: "danger",
    label: "Uninstall"
  },
  parameters: variantParams
};

// Sizes

export const Auto: Story = {
  args: {
    variant: "neutral",
    label: "Click Me",
    size: "auto",
  },
  parameters: sizeParams
};

export const Md: Story = {
  args: {
    variant: "neutral",
    label: "Click Me",
    size: "md",
  },
  parameters: sizeParams
};

export const Sm: Story = {
  args: {
    variant: "neutral",
    label: "Click Me",
    size: "sm",
  },
  parameters: sizeParams
};

export const Lg: Story = {
  args: {
    variant: "neutral",
    label: "Click Me",
    size: "lg",
  },
  parameters: sizeParams
};

// Icons 

export const Icon: Story = {
  args: {
    variant: "neutral",
    label: "",
    iconImageB64: b64images.icons.refresh,
    size: "icon",
  },
  parameters: sizeParams
};

export const IconSm: Story = {
  args: {
    variant: "neutral",
    label: "",
    iconImageB64: b64images.icons.refresh,
    size: "icon-sm",
  },
  parameters: sizeParams
};

export const IconLabel: Story = {
  args: {
    variant: "neutral",
    label: "Refresh",
    iconImageB64: b64images.icons.refresh,
    size: "icon-label",
  },
  parameters: sizeParams
};