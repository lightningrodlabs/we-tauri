import './card';
import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

export interface CardProps {
  title: string;
  heading: string;
  hasContextMenu: boolean;
  theme: 'dark' | 'light';
}

const meta: Meta<CardProps> = {
  title: 'NHComponentShoelace/Card',
  component: 'nh-card',
  argTypes: {
    title: { control: 'text' },
    heading: { control: 'text' },
    theme: { control: 'none' },
  },
  render:  (args) => html`<nh-card .theme=${args.theme} .title=${args.title} .heading=${args.heading} .hasContextMenu=${args.hasContextMenu}>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. In mi massa, auctor vitae viverra et, consequat vulputate felis. Integer congue leo quis urna vestibulum varius. Duis vehicula ligula id leo.</p>
  </nh-card>`,
};

export default meta;

type Story = StoryObj<CardProps>;
export const Basic: Story = {
  args: {
    theme: 'dark'
  },
  render:  meta.render,
};

export const Default: Story = {
  args: {
    title: 'Primary Title',
    heading: 'Primary Heading',
    theme: 'dark'
  },
};
export const TitleNoHeading: Story = {
  args: {
    title: 'Welcome to Neighbourhoods',
    heading: '',
    theme: 'dark'
  },
};
export const DotsMenu: Story = {
  args: {
    title: 'Welcome to Neighbourhoods',
    heading: '',
    hasContextMenu: true,
    theme: 'dark'
  },
};
export const HeadingNoTitle: Story = {
  args: {
    title: '',
    heading: 'Primary Heading',
    theme: 'dark'
  },
};