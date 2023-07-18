import './card';
import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { BasicWidget } from "./assessment-widget.stories";
import { pearImg } from './b64images';

export interface CardProps {
  title: string;
  heading: string;
  hasContextMenu: boolean;
  hasWidget?: boolean;
  theme: 'dark' | 'light';
}

const meta: Meta<CardProps> = {
  title: 'NHComponentShoelace/Card',
  component: 'nh-card',
  argTypes: {
    title: { control: 'text' },
    heading: { control: 'text' },
    theme: { control: 'none' },
    hasWidget: { control: 'boolean' },
  },
  render:  (args) => html`<nh-card .theme=${args.theme} .title=${args.title} .heading=${args.heading} .hasContextMenu=${args.hasContextMenu}>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. In mi massa, auctor vitae viverra et, consequat vulputate felis. Integer congue leo quis urna vestibulum varius. Duis vehicula ligula id leo.</p>
    ${args.hasWidget ? html`<p slot="footer">${(BasicWidget as any).render({
      name: 'Pear',
      iconAlt: 'a pear', 
      iconImg: pearImg
    })}</p>` : null}
  </nh-card>`,
};

export default meta;

type Story = StoryObj<CardProps>;
export const Basic: Story = {
  args: {
    theme: 'dark',
    hasWidget: false
  },
  render:  meta.render,
};


export const Default: Story = {
  args: {
    title: 'Primary Title',
    heading: 'Primary Heading',
    theme: 'dark',
    hasWidget: false
  },
};
export const TitleNoHeading: Story = {
  args: {
    title: 'Welcome to Neighbourhoods',
    heading: '',
    theme: 'dark',
    hasWidget: false
  },
};
export const DotsMenu: Story = {
  args: {
    title: 'Welcome to Neighbourhoods',
    heading: '',
    hasContextMenu: true,
    theme: 'dark',
    hasWidget: false
  },
};
export const HeadingNoTitle: Story = {
  args: {
    title: '',
    heading: 'Primary Heading',
    theme: 'dark',
    hasWidget: false
  },
};