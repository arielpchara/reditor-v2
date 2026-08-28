export type LogMeta = Record<string, unknown>;

export type Logger = {
  info: (message: string, meta?: LogMeta) => void;
  warn: (message: string, meta?: LogMeta) => void;
  error: (message: string, meta?: LogMeta) => void;
  debug: (message: string, meta?: LogMeta) => void;
};
