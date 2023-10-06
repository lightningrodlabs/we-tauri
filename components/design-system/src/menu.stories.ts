import NHMenu from "./menu";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";

customElements.define('nh-menu', NHMenu)

export interface MenuProps {
}

const meta: Meta<MenuProps> = {
  title: "NHComponent/Menu",
  component: "nh-menu",
  argTypes: {
  },
  render: (_args) => html`<nh-menu
  >
  </nh-menu>`,
};

export default meta;

type Story = StoryObj<MenuProps>;

export const Default: Story = {
  args: {
  },
};