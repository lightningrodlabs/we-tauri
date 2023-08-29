import "../card";
import "../button";
import "./create-post";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";

export interface CreatePostProps {
  theme: string;
  prompt: string;
  placeholder: string;
  sampleInput: string;
}

const meta: Meta<CreatePostProps> = {
  title: "NHComponent/CreatePost",
  component: "nh-create-post",
  argTypes: {
    prompt: { control: "text" },
  },
  render: (args) => html`<nh-create-post
    .theme=${args.theme}
    .prompt=${args.prompt}
    .textAreaValue=${args.sampleInput}
    .placeholder=${args.placeholder}
  >
    <nh-button .disabled=${() => {return args.sampleInput == ""}} slot="footer" .variant=${"primary"} .size=${"md"} .label=${"Post"} .onClick=${() =>  {debugger;}}></nh-button>
  </nh-create-post>`,
};

export default meta;

type Story = StoryObj<CreatePostProps>;
export const Blank: Story = {
  args: {
    theme: "dark",
    prompt: "What's on your mind?",
    placeholder: "Type something...",
    sampleInput: "",
  },
};

export const SampleInput: Story = {
  args: {
    prompt: "What's on your mind?",
    placeholder: "Type something...",
    sampleInput: "here we go",
  },
};