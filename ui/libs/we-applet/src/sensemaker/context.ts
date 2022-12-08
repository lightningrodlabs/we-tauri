import { createContext } from '@lit-labs/context';
import { SensemakerStore } from './sensemakerStore';

export const sensemakerStoreContext = createContext<SensemakerStore>(
  'sensemaker/store'
);