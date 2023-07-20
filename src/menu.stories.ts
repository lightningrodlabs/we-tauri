import "./menu";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";

export interface MwnuProps {
  direction: "vertical" | "horizontal";
  itemLabels: string[];
  itemComponentTag: string;
  itemComponentProps: object;
  theme: string;
  fixedFirstItem: boolean;
}

const meta: Meta<MwnuProps> = {
  title: "NHComponent/Menu",
  component: "nh-menu",
  argTypes: {},
  render: (args) => html`<nh-menu
    direction=${args.direction}
    itemLabels=${args.itemLabels}
    itemComponentTag=${args.itemComponentTag}
    itemComponentProps=${args.itemComponentProps}
    theme=${args.theme}
    fixedFirstItem=${args.fixedFirstItem}
  >
  </nh-menu>`,
};

export default meta;

type Story = StoryObj<MwnuProps>;

export const Horizontal: Story = {
  args: {
    direction: "horizontal",
    itemLabels: ["Posts", "Popular", "Recent", "Review"],
    itemComponentTag: "nh-button",
    itemComponentProps: { variant: "primary" },
    fixedFirstItem: false,
    theme: "dark",
  },
};

export const Vertical: Story = {
  args: {
    direction: "vertical",
    itemLabels: ["Posts", "Popular", "Recent", "Review"],
    itemComponentTag: "nh-button",
    itemComponentProps: { variant: "primary" },
    fixedFirstItem: false,
    theme: "dark",
  },
};
