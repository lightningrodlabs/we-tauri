import { css } from "lit";

export const sharedStyles = css`

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

  .title {    
    font-size: 20px;
  }

  .placeholder {
    color: rgba(0, 0, 0, 0.7);
  }
`;
