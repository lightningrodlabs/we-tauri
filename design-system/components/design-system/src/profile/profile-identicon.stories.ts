import NHProfileIdenticon from "./profile-identicon";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";

customElements.define('nh-profile-identicon', NHProfileIdenticon)

export interface ProfileIdenticonProps {
  agentName: string;
  agentHashB64: string;
  loading: boolean;
  background: boolean;
  responsive: boolean;
}

const meta: Meta<ProfileIdenticonProps> = {
  title: "NHComponent/Profile/Identicon",
  component: "nh-profile-card",
  argTypes: {
    agentName: { control: "text" },
  },
  parameters: { 
    backgrounds: { default: 'backdrop' },
  },
  render: (args) => html`<nh-profile-identicon
    .agentName=${args.agentName}
    .agentHashB64=${args.agentHashB64}
    .loading=${args.loading}
    .background=${args.background}
    .responsive=${args.responsive}
  >
  </nh-profile-identicon>`,
};

export default meta;

type Story = StoryObj<ProfileIdenticonProps>;
export const BlankLarge: Story = {
  args: {
    agentName: "",
    agentHashB64: "uhC0kLS6hx9Nzxi0scJdhMwNYrApyDb5iFTVehaKpa9JN5BKAauOV",
    background: true,
  },
};

export const SampleInputLarge: Story = {
  args: {
    agentName: "Muhammad",
    agentHashB64: "uhC0kLS6hx9Nzxi0scJdhMwNYrApyDb5iFTVehaKpa9JN5BKAauOV",
    background: true,
  },
};
export const LoadingLarge: Story = {
  args: {
    loading: true,
    background: true,
    agentHashB64: "uhC0kLS6hx9Nzxi0scJdhMwNYrApyDb5iFTVehaKpa9JN5BKAauOV",
  },
};
export const TransparentLarge: Story = {
  args: {
    agentName: "Miranda",
    background: false,
    loading: false,
    agentHashB64: "uhC0kLS6hx9Nzxi0scJdhMwNYrApyDb5iFTVehaKpa9JN5BKAauOV",
  },
};
export const TransparentLoadingLarge: Story = {
  args: {
    background: false,
    loading: true,
    agentHashB64: "uhC0kLS6hx9Nzxi0scJdhMwNYrApyDb5iFTVehaKpa9JN5BKAauOV",
  },
};
export const SmallResponsive: Story = {
  args: {
    agentName: "Muhammad",
    agentHashB64: "uhC0kLS6hx9Nzxi0scJdhMwNYrApyDb5iFTVehaKpa9JN5BKAauOV",
    background: true,
    responsive: true,
  },
};
export const TransparentSmallResponsive: Story = {
  args: {
    agentName: "Muhammad",
    agentHashB64: "uhC0kLS6hx9Nzxi0scJdhMwNYrApyDb5iFTVehaKpa9JN5BKAauOV",
    background: false,
    responsive: true,
  },
};