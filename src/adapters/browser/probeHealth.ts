import http from 'http';
import https from 'https';

export const probeHealth = (url: string): Promise<boolean> =>
  new Promise((resolve) => {
    const onResponse = (res: http.IncomingMessage): void => {
      res.resume();
      resolve(res.statusCode === 200);
    };
    const req = url.startsWith('https:')
      ? https.get(url, { rejectUnauthorized: false }, onResponse)
      : http.get(url, onResponse);
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
