export type OpenUrlCommand = {
  command: string;
  args: string[];
};

export type OpenUrlResult = { ok: true } | { ok: false; error: string };

export type BrowserOpener = {
  open: (url: string) => OpenUrlResult;
};

export type ReadyCheck = () => Promise<boolean>;

export type DelayFn = (ms: number) => Promise<void>;
