import './card';
import { TemplateResult, html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { Card } from './card.stories';

interface CardListProps {
  children: () => TemplateResult
}
interface CardProps {
  title: string;
  heading: string;
  hasContextMenu: boolean;
}

interface CardListProps {
  cards: CardProps[];
}
const meta: Meta<CardListProps> = {
  title: 'NHComponentShoelace/CardList',
  component: 'nh-card-list',
  argTypes: {
    cards: {control: 'none'}
  },
  render:  (args) => html`<nh-card-list>${args.cards.map(card => (Card as any).render(card))}</nh-card-list>`,
};

export default meta;

type Story = StoryObj<CardListProps>;

export const Primary: Story = {
  args: {
    cards: [
      { title: 'Card 1', heading: 'Heading 1', hasContextMenu: true },
      { title: 'Card 2', heading: 'Heading 2', hasContextMenu: true },
      { title: 'Card 3', heading: 'Heading 3', hasContextMenu: true },
      // Add more cards as needed...
    ],
  },
};