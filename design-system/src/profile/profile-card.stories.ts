import NHProfileCard from "./profile-card";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";

customElements.define('nh-profile-card', NHProfileCard)

export interface ProfileCardProps {
  agentName: string;
  agentHashB64: string;
}

const meta: Meta<ProfileCardProps> = {
  title: "NHComponent/ProfileCard",
  component: "nh-profile-card",
  argTypes: {
    agentName: { control: "text" },
  },
  render: (args) => html`<nh-profile-card
    .agentName=${args.agentName}
    .agentHashB64=${args.agentHashB64}
  >
  </nh-profile-card>`,
};

export default meta;

type Story = StoryObj<ProfileCardProps>;
export const Blank: Story = {
  args: {
    agentName: "Dave",
    agentHashB64: "uhC0kLS6hx9Nzxi0scJdhMwNYrApyDb5iFTVehaKpa9JN5BKAauOV",
  },
};

export const SampleInput: Story = {
  args: {
    agentName: "Miranda",
    agentHashB64: "uhC0kLS6hx9Nzxi0scJdhMwNYrApyDb5iFTVehaKpa9JN5BKAauOV",
  },
};
