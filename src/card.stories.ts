import './card';
import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

interface CardProps {
  title: string;
  heading: string;
}

const meta: Meta<CardProps> = {
  title: 'NHComponentShoelace/Card',
  component: 'nh-card',
  argTypes: {
    title: { control: 'text' },
    heading: { control: 'text' },
  },
  render:  (args) => html`<nh-card .title=${args.title} .heading=${args.heading}></nh-card>`,
};

export default meta;

type Story = StoryObj<CardProps>;

export const Primary: Story = {
  args: {
    title: 'Primary Title',
    heading: 'Primary Heading',
  },
};