import { html } from "lit";
import { spreadProps } from '@open-wc/lit-helpers'
import type { Meta, StoryObj } from "@storybook/web-components";

import NHButton from '../button'
import NHCreatePost from "./create-post";

import { NHComponent } from '../ancestors/base'

class TestRoot extends NHComponent {
  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-create-post': NHCreatePost,
  }

  render() {
    return html`<nh-create-post
    .theme=${this.theme}
    .prompt=${this.prompt}
    .textAreaValue=${this.sampleInput}
    .placeholder=${this.placeholder}
  >
    <nh-button .disabled=${!this.valid} slot="footer" .variant=${"primary"} .size=${"md"} .onClick=${() => {}}>Post</nh-button>
  </nh-create-post>`
  }
}

customElements.define('create-post--test-root', TestRoot)

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
  render: (args) => html`<create-post--test-root ${spreadProps(args)} />`,
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
