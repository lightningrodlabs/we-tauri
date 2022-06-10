import { css } from "lit";

export const sharedStyles = css`

  body {
    font-family: Roboto, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  h4 {
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
`;
