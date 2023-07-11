import { Assessment, DimensionEh } from '@neighbourhoods/client';

export interface AssessmentTableRecord {
  resource: object;
  neighbour: string;
  [key: string]: DimensionEh | object | string;
}

export enum AssessmentTableType {
  Resource = 'resource',
  Context = 'context',
}

export type AssessmentDict = {
  [entryHash: string]: Assessment[];
};

export interface AppletRenderInfo {
  name: string;
  resourceNames?: string[];
}
export type DimensionDict = {
  [id: string]: Uint8Array;
};
export type ContextEhDict = DimensionDict;

export enum LoadingState {
  FirstRender = 'first-render',
  NoAppletSensemakerData = 'no-applet-sensemaker-data',
}
