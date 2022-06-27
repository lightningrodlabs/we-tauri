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

`;
