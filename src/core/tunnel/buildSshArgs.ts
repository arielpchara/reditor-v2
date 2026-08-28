import { TunnelRequest } from './types';

export const DEFAULT_TUNNEL_REMOTE_HOST = '127.0.0.1';

export const buildSshArgs = (request: TunnelRequest): string[] => [
  '-N',
  '-L',
  `${request.localPort}:${request.remoteHost}:${request.remotePort}`,
  '-o',
  'ExitOnForwardFailure=yes',
  '-o',
  'ServerAliveInterval=30',
  '-o',
  'ServerAliveCountMax=3',
  request.target,
];
