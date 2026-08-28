export type TunnelRequest = {
  target: string;
  localPort: number;
  remotePort: number;
  remoteHost: string;
  sshPort?: number;
  identity?: string;
};

export type TunnelSession = {
  wait: () => Promise<number>;
  close: () => void;
};

export type TunnelOpener = {
  open: (request: TunnelRequest) => TunnelSession;
};
