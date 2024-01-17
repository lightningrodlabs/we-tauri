import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";

import { b64images } from '@neighbourhoods/design-system-styles';

import { Empty } from "./widgets/assessment-container.stories";
import NHButton from './button'
import NHCard from './card'

import { NHComponent } from './ancestors/base'

class TestRoot extends NHComponent implements CardProps {
  textSize: "lg" | "md" | "sm";
  footerAlign: "l" | "r" | "c";
  title: string;
  theme: "dark" | "light";
  heading: string;
  hasContextMenu: boolean;
  hasPrimaryAction?: boolean | undefined;
  contentText?: string | undefined;
  hasWidget?: boolean | undefined;

  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-card': NHCard,
  }

  render() {
    return html`<nh-card
    .theme=${this.theme}
    .title=${this.title}
    .heading=${this.heading}
    .hasContextMenu=${this.hasContextMenu}
    .hasPrimaryAction=${this.hasPrimaryAction}
    .textSize=${this.textSize}
    .footerAlign=${this.footerAlign}
  >
    <p>
      ${this.contentText || `Lorem ipsum dolor sit amet, consectetur adipiscing elit. In mi massa,
      auctor vitae viverra et, consequat vulputate felis. Integer congue leo
      quis urna vestibulum varius. Duis vehicula ligula id leo.`}
    </p>
    ${this.hasWidget && !this.hasPrimaryAction
      ? html`<div slot="footer">
          ${(Empty as any).render({
            name: "Pear",
            iconAlt: "a pear",
            iconImg: b64images.icons.pear,
          })}
        </div>`
      : null}
    ${this.hasPrimaryAction && !this.hasWidget
      ? html`<div slot="footer">
          <nh-button ?disabled=${false} type="primary">Install</nh-button>
        </div>`
      : null}
  </nh-card>`
  }
}

customElements.define('card--test-root', TestRoot)

export interface CardProps {
  title: string;
  heading: string;
  hasContextMenu: boolean;
  hasWidget?: boolean;
  hasPrimaryAction?: boolean;
  contentText?: string;
  theme: "dark" | "light";
  textSize: "lg" | "md" | "sm";
  footerAlign: "l" | "r" | "c";
}

const meta: Meta<CardProps> = {
  title: "NHComponent/Card",
  component: 'card--test-root',
  parameters: {
    backgrounds: { default: 'backdrop' },
  },
  argTypes: {
    title: { control: "text" },
    heading: { control: "text" },
    theme: { control: "none" },
    footerAlign: { control: "none" },
    textSize: { control: "none" },
    hasWidget: { control: "boolean" },
    hasPrimaryAction: { control: "boolean" },
    hasContextMenu: { control: "boolean" },
    // textSize: { options: ["md", "sm"], control: { type: "radio" } },
  },
  render: (args) => html`<card--test-root .title=${args.title} .heading=${args.heading} .theme=${args.theme} .footerAlign=${args.footerAlign} .textSize=${args.textSize} .hasWidget=${args.hasWidget} .hasPrimaryAction=${args.hasPrimaryAction} .hasContextMenu=${args.hasContextMenu} />`,
};

export default meta;

type Story = StoryObj<CardProps>;
export const Basic: Story = {
  args: {
    title: "Title",
    theme: "dark",
    hasWidget: false,
    textSize: "md",
    footerAlign: "c",
  },

  render: meta.render,
};

export const Default: Story = {
  args: {
    title: "Primary Title",
    heading: "Primary Heading",
    theme: "dark",
    hasWidget: false,
    textSize: "md",
    footerAlign: "c",
  },
};
export const TitleNoHeading: Story = {
  args: {
    title: "Welcome to Neighbourhoods",
    heading: "",
    theme: "dark",
    hasWidget: false,
    textSize: "md",
    footerAlign: "c",
  },
};
export const DotsMenu: Story = {
  args: {
    title: "Welcome to Neighbourhoods",
    heading: "hello there",
    hasContextMenu: true,
    theme: "dark",
    hasWidget: false,
    textSize: "md",
    footerAlign: "c",
  },
};
export const HeadingNoTitle: Story = {
  args: {
    title: "",
    heading: "Primary Heading",
    theme: "dark",
    hasWidget: false,
    textSize: "md",
    footerAlign: "c",
  },
};
export const HeadingNoTitleTextSm: Story = {
  args: {
    title: "",
    heading: "Feed",
    theme: "dark",
    hasWidget: false,
    textSize: "sm",
    footerAlign: "c",
  },
};
