import "../card";
import "../button";
import "./post-card";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";
import { BasicWidget } from "../assessment-widget.stories";

export interface PostCardProps {
  theme: string;
  title: string;
  textContent: string;
  img: string;
  hasImage: boolean;
}

const meta: Meta<PostCardProps> = {
  title: "NHComponent/PostCard",
  component: "nh-post-card",
  argTypes: {
    title: { control: "text" },
    textContent: { control: "text" },
  },
  render: (args) => html`<nh-post-card
    .theme=${args.theme}
    .title=${args.title}
    .textContent=${args.textContent}
  >
  ${args.hasImage ? html`<img src="https://picsum.photos/200/300" slot="image"/>` : null}
  </nh-post-card>`,
};

export default meta;

type Story = StoryObj<PostCardProps>;
export const TextOnly: Story = {
  args: {
    theme: "dark",
    title: "A test in Latin?",
    textContent: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean posuere luctus aliquam. Proin semper lorem id sem auctor ultrices. Nullam nec finibus mauris. Maecenas nec leo ut orci maximus gravida. Sed urna magna, varius id egestas quis, eleifend quis lorem. Pellentesque nec metus fermentum, consequat mi nec, sodales arcu. Maecenas ullamcorper, odio at faucibus suscipit, turpis lectus consequat diam, vel aliquet turpis nunc sit amet felis.",
    hasImage: false
  },
}
export const TextAndImage: Story = {
  args: {
    theme: "dark",
    title: "A test in Latin?",
    textContent: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean posuere luctus aliquam. Proin semper lorem id sem auctor ultrices. Nullam nec finibus mauris.",
    hasImage: true
  },
};