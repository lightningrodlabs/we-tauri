import "./card";
import "./button";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";
import { BasicWidget } from "./assessment-widget.stories";
import { pearImg } from "./b64images";

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
  title: "NHComponentShoelace/Card",
  component: "nh-card",
  argTypes: {
    title: { control: "text" },
    heading: { control: "text" },
    theme: { control: "none" },
    footerAlign: { control: "none" },
    textSize: { control: "none" },
    hasWidget: { control: "boolean" },
    hasPrimaryAction: { control: "boolean" },
    // textSize: { options: ["md", "sm"], control: { type: "radio" } },
  },
  render: (args) => html`<nh-card
    .theme=${args.theme}
    .title=${args.title}
    .heading=${args.heading}
    .hasContextMenu=${args.hasContextMenu}
    .hasPrimaryAction=${args.hasPrimaryAction}
    .textSize=${args.textSize}
    .footerAlign=${args.footerAlign}
  >
    <p>
      ${args.contentText || `Lorem ipsum dolor sit amet, consectetur adipiscing elit. In mi massa,
      auctor vitae viverra et, consequat vulputate felis. Integer congue leo
      quis urna vestibulum varius. Duis vehicula ligula id leo.`}
    </p>
    ${args.hasWidget && !args.hasPrimaryAction
      ? html`<div slot="footer">
          ${(BasicWidget as any).render({
            name: "Pear",
            iconAlt: "a pear",
            iconImg: pearImg,
          })}
        </div>`
      : null}
    ${args.hasPrimaryAction && !args.hasWidget
      ? html`<div slot="footer">
          <nh-button ?disabled=${false} label="Install" type="primary"></nh-button>
        </div>`
      : null}
  </nh-card>`,
};

export default meta;

type Story = StoryObj<CardProps>;
export const Basic: Story = {
  args: {
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
    heading: "",
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
