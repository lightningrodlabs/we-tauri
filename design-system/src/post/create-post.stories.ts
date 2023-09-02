import "../_shared_customElements";
import NHCreatePost from "./create-post";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";

customElements.define('nh-create-post', NHCreatePost)

export interface CreatePostProps {
  theme: string;
  prompt: string;
  placeholder: string;
  sampleInput: string;
  valid: boolean;
}

const meta: Meta<CreatePostProps> = {
  title: "NHComponent/Post/Create",
  component: "nh-create-post",
  argTypes: {
    prompt: { control: "text" },
  },
  parameters: { 
    backgrounds: { default: 'backdrop' },
  },
  render: (args) => html`<nh-create-post
    .theme=${args.theme}
    .prompt=${args.prompt}
    .textAreaValue=${args.sampleInput}
    .placeholder=${args.placeholder}
  >
    <nh-button .disabled=${!args.valid} slot="footer" .variant=${"primary"} .size=${"md"} .label=${"Post"} .onClick=${() =>  {debugger;}}></nh-button>
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
    valid: false,
  },
};

export const SampleInputInvalid: Story = {
  args: {
    prompt: "What's on your mind?",
    placeholder: "Type something...",
    sampleInput: "here we go",
    valid: false,
  },
};


export const SampleInputValid: Story = {
  args: {
    prompt: "What's on your mind?",
    placeholder: "Type something...",
    sampleInput: "here we go with some valid input!",
    valid: true,
  },
};
