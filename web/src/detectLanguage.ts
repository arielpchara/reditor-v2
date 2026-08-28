const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  html: 'html',
  xml: 'xml',
  svg: 'xml',
  css: 'css',
  scss: 'css',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
  md: 'markdown',
  mdx: 'markdown',
  py: 'python',
  rs: 'rust',
  go: 'go',
  sql: 'sql',
  toml: 'plaintext',
  ini: 'plaintext',
  env: 'plaintext',
  conf: 'plaintext',
  txt: 'plaintext',
};

export const detectLanguage = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_LANG[ext] ?? 'plaintext';
};
