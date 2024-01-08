import NHSelectAvatar from "./select-avatar";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";
import { b64images } from "@neighbourhoods/design-system-styles";

customElements.define('nh-select-avatar', NHSelectAvatar)

export interface SelectAvatarProps {
  name: string;
  shape: string;
  required: boolean;
  label: string;
  defaultValue?: string;
}

const meta: Meta<SelectAvatarProps> = {
  title: "NHComponent/SelectAvatar",
  component: "nh-select-avatar",
  argTypes: {
  },
  render: (args) => args?.defaultValue ? html`<nh-select-avatar
    .name=${args.name}
    .shape=${args.shape}
    .label=${args.label}
    .defaultValue=${args.defaultValue}
    ?required=${true}
  >
  </nh-select-avatar>`
  : html`<nh-select-avatar
    .name=${args.name}
    .shape=${args.shape}
    .label=${args.label}
    ?required=${true}
  >
  </nh-select-avatar>`,
};

export default meta;

type Story = StoryObj<SelectAvatarProps>;

export const Circle: Story = {
  args: {
    name: 'User Avatar',
    shape: 'circle',
    label: 'User Avatar',
    required: true,
  },
}

export const Square: Story = {
  args: {
    name: 'User Avatar',
    shape: 'square',
    label: 'User Avatar',
    required: true,
  },
}

export const Rounded: Story = {
  args: {
    name: 'User Avatar',
    shape: 'rounded',
    label: 'User Avatar',
    required: true,
  },
};

export const DefaultValue: Story = {
  args: {
    name: 'User Avatar',
    shape: 'rounded',
    label: 'User Avatar',
    required: true,
    defaultValue: b64images.icons.backCaret
  },
};
