import http from 'http';
import https from 'https';
import { AddressInfo } from 'net';
import selfsigned from 'selfsigned';
import { probeHealth } from '../../../adapters/browser/probeHealth';

describe('probeHealth', () => {
  it('returns true when HTTP /health responds 200', async () => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200);
      res.end('{"status":"ok"}');
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const { port } = server.address() as AddressInfo;
    try {
      await expect(probeHealth(`http://127.0.0.1:${port}/health`)).resolves.toBe(true);
    } finally {
      server.close();
    }
  });

  it('returns true when HTTPS /health responds 200', async () => {
    const pems = await selfsigned.generate([{ name: 'commonName', value: 'localhost' }], {
      algorithm: 'sha256',
    });
    const server = https.createServer({ key: pems.private, cert: pems.cert }, (_req, res) => {
      res.writeHead(200);
      res.end('{"status":"ok"}');
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const { port } = server.address() as AddressInfo;
    try {
      await expect(probeHealth(`https://127.0.0.1:${port}/health`)).resolves.toBe(true);
    } finally {
      server.close();
    }
  });

  it('returns false when the port is closed', async () => {
    await expect(probeHealth('http://127.0.0.1:1/health')).resolves.toBe(false);
  });
});
