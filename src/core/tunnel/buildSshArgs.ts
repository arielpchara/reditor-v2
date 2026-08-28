import { TunnelRequest } from './types';

export const DEFAULT_TUNNEL_REMOTE_HOST = '127.0.0.1';

export const buildSshArgs = (request: TunnelRequest): string[] => {
  const args: string[] = [
    '-N',
    '-L',
    `${request.localPort}:${request.remoteHost}:${request.remotePort}`,
  ];
  if (request.sshPort !== undefined) {
    args.push('-p', String(request.sshPort));
  }
  if (request.identity !== undefined) {
    args.push('-i', request.identity, '-o', 'IdentitiesOnly=yes');
  }
  args.push(
    '-o',
    'ExitOnForwardFailure=yes',
    '-o',
    'StrictHostKeyChecking=accept-new',
    '-o',
    'ServerAliveInterval=30',
    '-o',
    'ServerAliveCountMax=3',
    request.target,
  );
  return args;
};
