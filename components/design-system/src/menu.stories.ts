import { b64images } from '@neighbourhoods/design-system-styles';
import NHMenu from "./menu";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";
import { StaticValue, literal } from "lit/static-html.js";

customElements.define('nh-menu', NHMenu)

export interface MenuProps {
  direction: "vertical" | "horizontal";
  itemLabels: string[];
  itemComponentTag: StaticValue;
  itemComponentProps: object;
  theme: string;
  fixedFirstItem: boolean;
  addItemButton: boolean;
}

const meta: Meta<MenuProps> = {
  title: "NHComponent/Menu",
  component: "nh-menu",
  argTypes: {
    direction: { control: "none" },
    itemComponentTag: { control: "none" },
    itemComponentProps: { control: "none" },
  },
  render: (args) => html`<nh-menu
    .direction=${args.direction}
    .itemLabels=${args.itemLabels}
    .itemComponentTag=${args.itemComponentTag}
    .itemComponentProps=${args.itemComponentProps}
    .theme=${args.theme}
    .fixedFirstItem=${args.fixedFirstItem}
    .addItemButton=${args.addItemButton}
  >
  </nh-menu>`,
};

export default meta;

type Story = StoryObj<MenuProps>;

export const HorizontalButtons: Story = {
  args: {
    direction: "horizontal",
    itemLabels: ["Posts", "Popular", "Recent", "Review"],
    itemComponentTag: literal`nh-button`,
    itemComponentProps: { variant: "primary", size: "lg" },
    fixedFirstItem: false,
    addItemButton: false,
    theme: "dark",
  },
};

export const VerticalButtons: Story = {
  args: {
    direction: "vertical",
    itemLabels: ["Posts", "Popular", "Recent", "Review"],
    itemComponentTag: literal`nh-button`,
    itemComponentProps: { variant: "primary", size: "auto" },
    fixedFirstItem: false,
    addItemButton: false,
    theme: "dark",
  },
};

export const DashboardIconButtons: Story = {
  args: {
    direction: "horizontal",
    itemLabels: ["", ""],
    itemComponentTag: literal`nh-button`,
    itemComponentProps: {
      variant: "primary",
      iconImageB64: b64images.icons.refresh,
      size: "icon",
    },
    fixedFirstItem: false,
    addItemButton: false,
    theme: "dark",
  },
};
export const HorizontalIconButtons: Story = {
  args: {
    direction: "horizontal",
    itemLabels: ["Posts", "Popular", "Recent", "Review"],
    itemComponentTag: literal`nh-button`,
    itemComponentProps: {
      variant: "primary",
      iconImageB64: b64images.icons.refresh,
      size: "lg",
    },
    fixedFirstItem: false,
    addItemButton: false,
    theme: "dark",
  },
};

export const HorizontalIconButtonsNoLabel: Story = {
  args: {
    direction: "horizontal",
    itemLabels: ["", "", "", ""],
    itemComponentTag: literal`nh-button`,
    itemComponentProps: {
      variant: "primary",
      iconImageB64: b64images.icons.refresh,
      size: "icon",
    },
    fixedFirstItem: false,
    addItemButton: false,
    theme: "dark",
  },
};

export const VerticalIconButtons: Story = {
  args: {
    direction: "vertical",
    itemLabels: ["Posts", "Popular", "Recent", "Review"],
    itemComponentTag: literal`nh-button`,
    itemComponentProps: {
      variant: "icon-label",
      iconImageB64: b64images.icons.forwardArrow,
      size: "auto",
    },
    fixedFirstItem: false,
    addItemButton: false,
    theme: "dark",
  },
};
export const HorizontalTabButtons: Story = {
  args: {
    fixedFirstItem: true,
    direction: "horizontal",
    itemLabels: ["Posts", "Popular", "Recent", "Review"],
    itemComponentTag: literal`nh-tab-button`,
    itemComponentProps: { size: "lg" },
    addItemButton: true,
    theme: "dark",
  },
};
