import NHMenu, { MenuSection } from "./menu";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";

customElements.define("nh-menu", NHMenu);

export interface MenuProps {
  menuSectionDetails: MenuSection[];
}

const meta: Meta<MenuProps> = {
  title: "NHComponent/Menu",
  component: "nh-menu",
  argTypes: {},
  render: (args) => html`<nh-menu
    .theme=${"dark"}
    .menuSectionDetails=${args.menuSectionDetails}
  >
  </nh-menu>`,
};

export default meta;

type Story = StoryObj<MenuProps>;

export const Default: Story = {
  args: {
    menuSectionDetails: [
      {
        sectionName: "Sensemaker",
        sectionMembers: [
          {
            label: "Overview",
            subSectionMembers: ["0-0", "0-1"],
            callback: () => {
              console.log("hi!");
            },
          },
          {
            label: "Roles",
            subSectionMembers: ["1-0", "1-1"],
            callback: () => {
              console.log("hi!");
            },
          },
        ],
      },
      {
        sectionName: "Another Section",
        sectionMembers: [
          {
            label: "Overview 2",
            subSectionMembers: ["1-0", "1-1"],
            callback: () => {
              console.log("hi!");
            },
          },
          {
            label: "Roles 2",
            subSectionMembers: ["2-0", "2-1"],
            callback: () => {
              console.log("hi!");
            },
          },
        ],
      },
    ],
  },
};
