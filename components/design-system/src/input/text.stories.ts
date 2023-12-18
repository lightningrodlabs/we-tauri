import NHTextInput from "./text";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";
import { NHTooltip } from "..";

customElements.define('nh-text-input', NHTextInput)
!customElements.get('nh-tooltip') && customElements.define('nh-tooltip', NHTooltip)

export interface TextInputProps {
  placeholder: string;
}

const meta: Meta<TextInputProps> = {
  title: "NHComponent/Input/TextInput",
  component: "nh-text-input",
  argTypes: {
    placeholder: { control: "text" }
  },
  parameters: { 
    backgrounds: { default: 'surface' },
  },
  render: (args) => html`<nh-text-input
    .placeholder=${args.placeholder}
  ></nh-text-input>`,
};

export default meta;

type Story = StoryObj<TextInputProps>;

export const Default: Story = {
  args: {
    placeholder: "Here is your field:",
  },
};

export const WithTooltip: Story = {
  render: (args) => html` <nh-tooltip .visible=${true} .variant=${"primary"} .text=${"Info about your field"}>
    <nh-text-input
    slot="hoverable"
    .placeholder=${args.placeholder}
    ></nh-text-input>
  </nh-tooltip>
  `,
  args: {
    placeholder: "Please text something:",
  },
};
export const RequiredUntouched: Story = {
  render: (args) => html` <nh-tooltip .visible=${true} .variant=${"danger"} .text=${"This is a required field."}>
    <nh-text-input
    ?required=${true}
    class="untouched"
    slot="hoverable"
    .placeholder=${args.placeholder}
    ></nh-text-input>
  </nh-tooltip>
  `,
  args: {
    placeholder: "Please text something:",
  },
};