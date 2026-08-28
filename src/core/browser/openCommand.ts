import { OpenUrlCommand } from './types';

export const buildOpenUrlCommand = (url: string, platform: string): OpenUrlCommand => {
  if (platform === 'darwin') {
    return { command: 'open', args: [url] };
  }
  if (platform === 'win32') {
    return { command: 'cmd', args: ['/c', 'start', '', url] };
  }
  return { command: 'xdg-open', args: [url] };
};
