export const buildEditorUrl = (port: number, useTls: boolean): string =>
  `${useTls ? 'https' : 'http'}://localhost:${port}`;

export const buildHealthUrl = (port: number, useTls: boolean): string =>
  `${useTls ? 'https' : 'http'}://127.0.0.1:${port}/health`;
