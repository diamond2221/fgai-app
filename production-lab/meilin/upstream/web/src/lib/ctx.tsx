import { createContext, useContext } from 'react';
import type { Config, Drama, Model, Nav } from '../api';

export type DirectorCtx = {
  config: Config;
  drama: Drama;
  episode: number | null;
  busy: boolean;
  run: (type: string, payload?: Record<string, unknown>, opts?: { from?: Element | null }) => Promise<boolean>;
  send: (text: string) => Promise<void>;
  upload: (file: File, body: Record<string, unknown>) => Promise<any>;
  go: (nav: Nav) => void;
  toast: (t: string) => void;
  openSettings: (tab?: string) => void;
  model: (id: string) => Model | undefined;
};
export const Ctx = createContext<DirectorCtx | null>(null);
export const useDirector = () => useContext(Ctx)!;
