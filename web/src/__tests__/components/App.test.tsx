import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { App } from '../../components/App';
import { storeSessionToken } from '../../otpApi';

vi.mock('../../components/Editor', () => ({
  Editor: function Editor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
      <textarea aria-label="editor" value={value} onChange={(e) => onChange(e.target.value)} />
    );
  },
}));

const jsonRes = (body: unknown, status = 200): Promise<Response> =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

const textRes = (body: string, status = 200): Promise<Response> =>
  Promise.resolve(new Response(body, { status, headers: { 'Content-Type': 'text/plain' } }));

const emptyRes = (status: number): Promise<Response> =>
  Promise.resolve(new Response(null, { status }));

describe('App', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('loads file content when security is disabled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/health') return jsonRes({ status: 'ok', securityEnabled: false });
        if (url === '/file-meta') return jsonRes({ filename: 'app.ts' });
        if (url === '/status') {
          return jsonRes({
            status: 'ok',
            host: 'localhost',
            port: 3000,
            directory: '/tmp',
            useTls: true,
            securityEnabled: false,
          });
        }
        if (url === '/file') return textRes('hello world');
        return jsonRes({}, 404);
      }),
    );

    render(<App />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('app.ts')).toBeInTheDocument());
    expect(screen.getByLabelText('editor')).toHaveValue('hello world');
    expect(screen.getByRole('status', { name: /serve status/i })).toBeInTheDocument();
    expect(screen.getByText('/tmp')).toBeInTheDocument();
  });

  it('shows the OTP dialog when security is enabled and no token is stored', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/health') return jsonRes({ status: 'ok', securityEnabled: true });
        return jsonRes({}, 401);
      }),
    );

    render(<App />);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByLabelText(/enter otp/i)).toBeInTheDocument();
  });

  it('re-prompts for OTP when a stored token is rejected with 401', async () => {
    storeSessionToken('stale-token', 300);
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/health') return jsonRes({ status: 'ok', securityEnabled: true });
        if (url === '/file-meta') return jsonRes({ error: 'Invalid or expired token' }, 401);
        return jsonRes({}, 401);
      }),
    );

    render(<App />);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(sessionStorage.getItem('reditor_token')).toBeNull();
  });

  it('saves editor content with PUT /file', async () => {
    const fetchFn = vi.fn((url: string, init?: RequestInit) => {
      if (url === '/health') return jsonRes({ status: 'ok', securityEnabled: false });
      if (url === '/file-meta') return jsonRes({ filename: 'app.ts' });
      if (url === '/status') {
        return jsonRes({
          status: 'ok',
          host: 'localhost',
          port: 3000,
          directory: '/tmp',
          useTls: true,
          securityEnabled: false,
        });
      }
      if (url === '/file' && init?.method === 'PUT') return emptyRes(204);
      if (url === '/file') return textRes('hello');
      return jsonRes({}, 404);
    });
    vi.stubGlobal('fetch', fetchFn);

    render(<App />);
    await waitFor(() => expect(screen.getByLabelText('editor')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('editor'), { target: { value: 'updated' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      const put = fetchFn.mock.calls.find(
        (call) => call[0] === '/file' && (call[1] as RequestInit | undefined)?.method === 'PUT',
      );
      expect(put).toBeDefined();
      expect(JSON.parse((put?.[1] as RequestInit).body as string)).toEqual({ content: 'updated' });
    });
    await waitFor(() => expect(screen.getByText(/saved/i)).toBeInTheDocument());
  });
});
