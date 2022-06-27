import { css } from "lit";

export const sharedStyles = css`

  body {
    font-family: Roboto, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  .default-font {
    font-family: Roboto, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  .column {
    display: flex;
    flex-direction: column;
  }
  .row {
    display: flex;
    flex-direction: row;
  }

  .center-content {
    justify-content: center;
    align-items: center;
  }

  .flex-scrollable-parent {
    position: relative;
    display: flex;
    flex: 1;
  }

  .flex-scrollable-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .flex-scrollable-x {
    max-width: 100%;
    overflow-x: auto;
  }
  .flex-scrollable-y {
    max-height: 100%;
    overflow-y: auto;
  }

  .title {
    align-items: center;
    font-family: Roboto, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-size: 1.7em;
    text-align: center;
  }
`;
