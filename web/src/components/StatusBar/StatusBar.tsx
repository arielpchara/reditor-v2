import { JSX } from 'react';
import './StatusBar.css';

export type StatusBarProps = {
  serveOk: boolean;
  tunnel: boolean;
  directory: string;
  host: string;
  port: number;
  useTls: boolean;
  securityEnabled: boolean;
};

export function StatusBar({
  serveOk,
  tunnel,
  directory,
  host,
  port,
  useTls,
  securityEnabled,
}: StatusBarProps): JSX.Element {
  const serveDot = serveOk ? 'status-bar__dot status-bar__dot--on' : 'status-bar__dot';
  const tunnelDot = tunnel ? 'status-bar__dot status-bar__dot--on' : 'status-bar__dot';
  return (
    <footer className="status-bar" role="status" aria-label="Serve status">
      <span className="status-bar__item" aria-label={serveOk ? 'Serve on' : 'Serve off'}>
        <span className={serveDot} aria-hidden="true" />
        Serve
      </span>
      <span className="status-bar__item" aria-label={tunnel ? 'Tunnel on' : 'Tunnel off'}>
        <span className={tunnelDot} aria-hidden="true" />
        Tunnel
      </span>
      {directory ? (
        <span className="status-bar__item status-bar__item--path" title={directory}>
          {directory}
        </span>
      ) : null}
      {host ? <span className="status-bar__item">{host}</span> : null}
      {port > 0 ? <span className="status-bar__item">:{String(port)}</span> : null}
      <span className="status-bar__item">{useTls ? 'TLS' : 'HTTP'}</span>
      <span className="status-bar__item">{securityEnabled ? 'OTP' : 'Open'}</span>
    </footer>
  );
}
