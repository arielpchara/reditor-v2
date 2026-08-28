export type ServeStatus = {
  status: string;
  host: string;
  port: number;
  directory: string;
  useTls: boolean;
  securityEnabled: boolean;
};

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export const isTunnelAccess = (
  location: { hostname: string; port: string; protocol: string },
  servePort: number,
): boolean => {
  if (!LOOPBACK_HOSTS.has(location.hostname)) {
    return false;
  }
  const pagePort = Number(location.port) || (location.protocol === 'https:' ? 443 : 80);
  return pagePort !== servePort;
};
