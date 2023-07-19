import "./button";
import "./card-list";
import "./page-header-card";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";
import { Basic, CardProps } from "./card.stories";
import { backArrow } from "./b64images";

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
  component: "nh-card-list",
  argTypes: {
    cards: { control: "none" },
    widgets: { control: "boolean" },
    buttons: { control: "boolean" },
    vertical: { control: "boolean" },
    grid: { control: "boolean" },
  },
  render: (args) => {
    return html`<nh-card-list
      .type=${args.grid ? "grid" : "linear"}
      .direction=${args.vertical ? "vertical" : "horizontal"}
    >
      ${args.hasHeader ? html`<nh-page-header-card slot="header" .heading=${"Applet Library"}>
        <img src="data:image/svg+xml;base64,${backArrow}" slot="secondary-action"/> 
        
        <nh-button label="Upload Applet File" slot="primary-action"><nh-button/>
      </nh-page-header-card>` : null}
      ${args.cards.map((card) => {
        card.hasWidget = args.widgets;
        card.hasPrimaryAction = args.buttons;
        card.contentText = args.contentText;
        return (Basic as any).render(card);
      })}</nh-card-list>`;
  },
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
        footerAlign: "c"
      },
      {
        title: "Card 2",
        heading: "Heading 2",
        hasContextMenu: true,
        theme: "dark",
        textSize: "md",
        footerAlign: "c"
      },
      {
        title: "Card 3",
        heading: "Heading 3",
        hasContextMenu: true,
        theme: "dark",
        textSize: "md",
        footerAlign: "c"
      },
      // Add more cards as needed...
    ],
    hasHeader: false
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
        footerAlign: "l"
      },
      {
        title: "Card 2",
        heading: "Heading 2",
        hasContextMenu: true,
        theme: "light",
        textSize: "md",
        footerAlign: "l"
      },
      {
        title: "Card 3",
        heading: "Heading 3",
        hasContextMenu: true,
        theme: "light",
        textSize: "md",
        footerAlign: "l"
      },
      // Add more cards as needed...
    ],
    widgets: true,
    hasHeader: false
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
  "Feed", "Chat", "Market", "Co-playlist", "Todo", "Calendar", "Notes", "Wiki"
];
export const AppletGrid: Story = {
  args: {
    cards:  headings.map(heading => ({ ...defaultSmallCardProperties, heading })) as any,
    contentText: "An informative and clear description of what the applet is, does and how amazing it is. So that people can download it with confidence that it will meet their needs. ",
    widgets: false,
    buttons: true,
    grid: true,
    hasHeader: true
  },
};
