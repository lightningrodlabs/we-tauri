import { html } from "lit";

export function isDataURL(s) {
  return !!s.match(isDataURL.regex);
}
isDataURL.regex = /^\s*data:([a-z]+\/[a-z0-9\-\+]+(;[a-z\-]+\=[a-z0-9\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i;

export const cleanForUI = (propertyName: string) =>
  propertyName.split('_').map(capitalize).join(' ');

// Helpers for generating markup
export function generateMockProfile(number: number) {
  return html` <img
    alt="profile"
    src="profile${number}.png"
    style="height: 2rem; object-fit: cover;"
  />`;
}
export function generateHeaderHTML(headerTitle: string, resourceName: string = 'Resource') {
  return html`<div
    style="
      margin: var(--header-title-margin-y) 0;
      height: 4rem;
      display: flex;
      flex-direction: column;
      justify-content: space-around;"
  >
    <h2
      style="font-family: var(--nh-font-families-headlines);
      font-weight: var(--sl-font-weight-semibold);
      min-width: var(--column-min-width);
      margin: 0;
      font-size: calc(1px * var(--nh-font-size-md));
      margin-bottom: var(--header-title-margin-y);;"
    >
      ${resourceName}
    </h2>
    <h4
      style="font-family: var(--nh-font-families-body);
      margin: 0; 
      font-size: calc(1px * var(--nh-font-size-sm));
      font-weight: var(--nh-font-weights-headlines-regular)"
    >
      ${headerTitle}
    </h4>
  </div>`;
}
export function generateHashHTML(hash: string) {
  return html`
    <div
      style="color: var(--nh-theme-fg-default);
      border: 1px solid var(--nh-theme-bg-detail);
      border-radius: var(--cell-hash-border-radius);
      font-family: var(--nh-font-families-body);
      font-size: var(--cell-hash-font-size);
      line-height: var(--nh-line-heights-headlines-bold);
      overflow: hidden;
      white-space: nowrap;
      padding: var(--cell-hash-padding);
      height: 1rem;
      width: calc(var(--column-max-width) - (2 * var(--cell-hash-padding)));
      text-overflow: ellipsis;"
    >
      ${hash}
    </div>
  `;
}

export const zip = (a, b) => a.map((k, i) => [k, b[i]]);
export const capitalize = part => part[0].toUpperCase() + part.slice(1);
export const snakeCase = str =>
  str &&
  str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map(x => x.toLowerCase())
    .join('_');

export const cleanResourceNameForUI = propertyName =>
  propertyName.split('_').map(capitalize).join(' ');
