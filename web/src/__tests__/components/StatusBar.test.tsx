import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from '../../components/StatusBar';

describe('StatusBar', () => {
  it('shows serve, tunnel, directory, host, and port', () => {
    render(
      <StatusBar
        serveOk={true}
        tunnel={true}
        directory="/etc/nginx"
        host="localhost"
        port={3000}
        useTls={true}
        securityEnabled={false}
      />,
    );
    expect(screen.getByRole('status', { name: /serve status/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Serve on')).toBeInTheDocument();
    expect(screen.getByLabelText('Tunnel on')).toBeInTheDocument();
    expect(screen.getByText('/etc/nginx')).toBeInTheDocument();
    expect(screen.getByText('localhost')).toBeInTheDocument();
    expect(screen.getByText(':3000')).toBeInTheDocument();
    expect(screen.getByText('TLS')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('marks serve and tunnel off without a green state', () => {
    render(
      <StatusBar
        serveOk={false}
        tunnel={false}
        directory="/tmp"
        host="0.0.0.0"
        port={8080}
        useTls={false}
        securityEnabled={true}
      />,
    );
    expect(screen.getByLabelText('Serve off')).toBeInTheDocument();
    expect(screen.getByLabelText('Tunnel off')).toBeInTheDocument();
    expect(screen.getByText('HTTP')).toBeInTheDocument();
    expect(screen.getByText('OTP')).toBeInTheDocument();
  });
});
