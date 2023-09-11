import { html } from "lit";
import { spreadProps } from '@open-wc/lit-helpers'
import type { Meta, StoryObj } from "@storybook/web-components";

import { b64images } from '@neighbourhoods/design-system-styles';

import { CardProps } from "./card.stories";
import NHButton from './button'
import NHCard from "./card";
import NHCardList from "./card-list";
import NHPageHeaderCard from "./page-header-card";

import { NHComponent } from './ancestors/base'

class TestRoot extends NHComponent {
  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-card': NHCard,
    'nh-card-list': NHCardList,
    'nh-page-header-card': NHPageHeaderCard,
  }

  render() {
    return html`<nh-card-list
      .type=${this.grid ? "grid" : "linear"}
      .direction=${this.vertical ? "vertical" : "horizontal"}
    >
      ${this.hasHeader
        ? html`<nh-page-header-card slot="header" .heading=${"Applet Library"}>
        <img src="data:image/svg+xml;base64,${b64images.icons.backCaret}" slot="secondary-action"/>
        <nh-button label="Upload Applet File" slot="primary-action"></nh-button>
      </nh-page-header-card>`
        : null}
      ${this.cards.map((card) => {
        card.hasWidget = this.widgets;
        card.hasPrimaryAction = this.buttons;
        card.contentText = this.contentText;
        return html`<nh-card ${spreadProps(card)} />`;
      })}</nh-card-list
    >`
  }
}

customElements.define('card-list--test-root', TestRoot)

interface CardListProps {
  cards: CardProps[];
  widgets: boolean;
  buttons: boolean;
  vertical: boolean;
  grid: boolean;
  hasHeader: boolean;
  contentText: string;
}
const meta: Meta<CardListProps> = {
  title: "NHComponent/CardList",
  component: "card-list--test-root",
  argTypes: {
    cards: { control: "none" },
    widgets: { control: "boolean" },
    buttons: { control: "boolean" },
    vertical: { control: "boolean" },
    grid: { control: "boolean" },
  },
  parameters: { 
    backgrounds: { default: 'canvas' },
  },
  render: (args) => html`<card-list--test-root ${spreadProps(args)} />`,
};

export default meta;

type Story = StoryObj<CardListProps>;

export const Dark: Story = {
  args: {
    cards: [
      {
        title: "Card 1",
        heading: "Heading 1",
        hasContextMenu: true,
        theme: "dark",
        textSize: "md",
        footerAlign: "c",
      },
      {
        title: "Card 2",
        heading: "Heading 2",
        hasContextMenu: true,
        theme: "dark",
        textSize: "md",
        footerAlign: "c",
      },
      {
        title: "Card 3",
        heading: "Heading 3",
        hasContextMenu: true,
        theme: "dark",
        textSize: "md",
        footerAlign: "c",
      },
      // Add more cards as needed...
    ],
    hasHeader: false,
  },
};
export const Light: Story = {
  args: {
    cards: [
      {
        title: "Card 1",
        heading: "Heading 1",
        hasContextMenu: true,
        theme: "light",
        textSize: "md",
        footerAlign: "l",
      },
      {
        title: "Card 2",
        heading: "Heading 2",
        hasContextMenu: true,
        theme: "light",
        textSize: "md",
        footerAlign: "l",
      },
      {
        title: "Card 3",
        heading: "Heading 3",
        hasContextMenu: true,
        theme: "light",
        textSize: "md",
        footerAlign: "l",
      },
      // Add more cards as needed...
    ],
    widgets: false,
    hasHeader: false,
  },
};

const defaultSmallCardProperties = {
  title: "",
  hasContextMenu: false,
  theme: "dark",
  textSize: "sm",
  footerAlign: "c",
  hasHeader: true,
};
const headings = [
  "Feed",
  "Chat",
  "Market",
  "Co-playlist",
  "Todo",
  "Calendar",
  "Notes",
  "Wiki",
];
export const AppletGrid: Story = {
  args: {
    cards: headings.map((heading) => ({
      ...defaultSmallCardProperties,
      heading,
    })) as any,
    contentText:
      "An informative and clear description of what the applet is, does and how amazing it is. So that people can download it with confidence that it will meet their needs. ",
    widgets: false,
    buttons: true,
    grid: true,
    hasHeader: true,
  },
};

export const AppletColumn: Story = {
  args: {
    cards: headings.map((heading) => ({
      ...defaultSmallCardProperties,
      heading,
    })) as any,
    contentText:
      "An informative and clear description of what the applet is, does and how amazing it is. So that people can download it with confidence that it will meet their needs. ",
    widgets: false,
    buttons: true,
    grid: false,
    hasHeader: true,
    vertical: true,
  },
};
