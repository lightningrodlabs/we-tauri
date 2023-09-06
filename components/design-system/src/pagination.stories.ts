import NHPagination from "./pagination";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";

customElements.define('nh-pagination', NHPagination)

export interface PaginationProps {
  length: number;
  arrows: boolean;
}

const meta: Meta<PaginationProps> = {
  title: "NHComponent/Pagination",
  component: "nh-pagination",
  argTypes: {
  },
  render: (args) => html`<nh-pagination
    length=${args.length}
    arrows=${true}
  >
  </nh-pagination>`,
};

export default meta;

type Story = StoryObj<PaginationProps>;

export const Default: Story = {
  args: {
    length: 9,
  },
};
