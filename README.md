# Reditor

```
 ____          _ _ _
|  _ \ ___  __| (_) |_ ___  _ __
| |_) / _ \/ _` | | __/ _ \| '__|
|  _ <  __/ (_| | | || (_) | |
|_| \_\___|\__,_|_|\__\___/|_|
```

**Edit files from your server in the browser.**

[![npx](https://img.shields.io/badge/npx-reditor-ff2d55?style=flat-square)](https://www.npmjs.com/package/reditor)
[![node](https://img.shields.io/badge/node-%3E%3D18-339933?style=flat-square)](https://nodejs.org)
[![license](https://img.shields.io/badge/license-ISC-blue?style=flat-square)](#license)
[![typescript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square)](https://www.typescriptlang.org)

SSH into a box. Fight vim. Save a YAML file. Or serve the file on the box, tunnel from your laptop, and edit it in the browser — OTP in the terminal, HTTPS out of the box.

```bash
# On the server
npx reditor serve /etc/nginx/nginx.conf

# On your laptop — leave this running
npx reditor tunnel user@that-server --port=8080
```

```
$ npx reditor tunnel user@that-server --port=8080

  🚇 SSH tunnel
     https://localhost:8080  →  user@that-server:3000
     Leave this running. Restart serve on the server without resetting the tunnel.
```

Open `https://localhost:8080`. Paste the OTP from the server terminal. Edit. Hit **⌘S** / **Ctrl+S**.

---

## Why

Editing a config on a remote machine should not mean wrestling a shell editor over SSH. Reditor starts a localhost HTTPS editor on the server; from your laptop you open an SSH tunnel and edit in the browser. Aimed at DevOps engineers and anyone who needs to change a file on a box without cloning a repo or installing an IDE.

Secure by default. Zero install. Keep `serve` bound to localhost — the tunnel is the recommended way in.

## Quick start

Requires [Node.js](https://nodejs.org) 18 or newer. **Recommended:** tunnel from your laptop so the editor stays on localhost on the server.

```bash
# 1. On the server — OTP prints here
npx reditor serve ./config.yaml

# 2. On your laptop — leave this open (survives serve restarts)
npx reditor tunnel user@that-server --port=8080

# 3. Browser
open https://localhost:8080
```

Same machine (no SSH):

```bash
npx reditor serve ./config.yaml
# then open https://localhost:3000
```

```bash
# Create the file if it does not exist
npx reditor serve ./new.yaml --create

# Serve on a non-default port — match it with --remote-port
npx reditor serve ./app.conf --port 4000
npx reditor tunnel user@that-server --port=8080 --remote-port 4000
```

Not on npm yet? Run it straight from GitHub:

```bash
npx github:arielpchara/reditor-refactored serve ./config.yaml
npx github:arielpchara/reditor-refactored tunnel user@that-server --port=8080
```

`npx` downloads, builds, and runs the CLI. First run needs the network; later runs use the cache.

### Docker demo

`serve` binds **127.0.0.1 inside the container**. HTTP is not published — not on `0.0.0.0`, not on the host. The only way in is SSH on `127.0.0.1:2222`, then `reditor tunnel`.

```bash
docker compose up --build
```

OTP prints in the compose logs. On your laptop:

```bash
npx reditor tunnel demo@127.0.0.1 --port=8080 --ssh-port 2222
```

Password is `demo` (demo only). Open `https://localhost:8080`. Edits land in `./demo` on the host.

## Features

- **Browser editor** — syntax highlighting from the file extension (`yaml`, `json`, `nginx.conf`, and more)
- **Save from the browser** — one click or **⌘S** / **Ctrl+S**; the button stays off until the file is dirty
- **Session history** — restore earlier saves from this run without leaving the page
- **HTTPS** — self-signed cert generated automatically (or bring your own)
- **OTP + JWT** — 6-digit code in the terminal, RS256 token in the browser
- **3-strike lockout** — three bad OTPs and the process exits
- **SSH tunnel** — `reditor tunnel --port=8080` on your laptop; stays up when you stop and restart `serve`
- **Fail-fast validation** — refuses directories, binary files, and anything over 512 KB
- **Zero install** — `npx reditor serve <file>` / `npx reditor tunnel <target>`

## CLI

### `serve` — run on the server

```bash
npx reditor serve <file> [options]
```

| Argument / option | Default | Description |
|---|---|---|
| `<file>` | required | Path to the file to edit |
| `-p, --port <port>` | `3000` | Port the server listens on |
| `-H, --host <host>` | `localhost` | Host the server binds to |
| `--create` | `false` | Create the file if it does not exist |
| `--token-ttl <seconds>` | `300` | JWT lifetime in seconds |
| `--force-disable-security` | `false` | **Danger.** Turn off OTP and JWT |

If `<file>` is missing, a directory, too large, or binary, Reditor prints an error and exits before opening a port.

If the file does not exist and you omit `--create`, you get a confirmation prompt.

### `tunnel` — run on your laptop (recommended)

```bash
npx reditor tunnel <user@host> [--port 8080]
```

| Argument / option | Default | Description |
|---|---|---|
| `<user@host>` | required | SSH target, or an SSH config `Host` |
| `-p, --port <port>` | `8080` | Local port — open `https://localhost:<port>` |
| `--remote-port <port>` | `3000` | Port `serve` is using on the server |
| `--ssh-port <port>` | `22` | SSH port on the target host |

Opens `ssh -N -L` and stays up until you hit Ctrl+C. Stopping `serve` does not close the tunnel — start another file and reuse it.

Needs `ssh` on your PATH. Auth uses your existing SSH config and keys.

## Security

OTP + JWT is **on by default**. Prefer `tunnel` from your laptop instead of binding `serve` to `0.0.0.0`. Use `--force-disable-security` only on an isolated, trusted network.

1. An **RSA-2048** key pair is generated in memory. Restarting the server invalidates every JWT.
2. A **6-digit OTP** is generated with `crypto.randomInt`.
3. The OTP works **once** for this process.
4. Tokens are **RS256**, expiring after `--token-ttl` seconds.
5. After **3 failed OTP attempts** the process exits. Binding off loopback prints a warning — that exit is a denial-of-service vector.

TLS is separate from auth. Set `USE_TLS=false` for plain HTTP without turning off OTP/JWT.

## Configuration

Environment variables are optional. CLI flags win when both are set.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Listen port |
| `HOST` | `localhost` | Bind address |
| `USE_TLS` | `true` | Set `false` for plain HTTP |
| `CERT_PATH` | — | TLS cert (PEM). Unset → self-signed |
| `KEY_PATH` | — | TLS private key (PEM) |

## HTTP API

Auth is a `Authorization: Bearer <jwt>` header when security is on (the default).

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | no | `{ "status": "ok", "securityEnabled": true }` |
| `POST` | `/auth/exchange-token` | OTP body | `{ "otp": "482910" }` → JWT. Missing when security is off. 3 failures → process exit |
| `GET` | `/file-meta` | JWT | Filename, size, type |
| `GET` | `/file` | JWT | Raw file content |
| `PUT` | `/file` | JWT | `{ "content": "…" }` → `204` |

## Development

```bash
npm install
npm run dev            # HTTPS server with live reload
npm test               # backend unit tests (Jest)
npm run test:web       # UI tests (Vitest)
npm run build:all      # CLI + web production build
npm run typecheck      # TypeScript
npm run format         # Prettier
```

Hexagonal architecture (ports and adapters). Conventions live in [AGENTS.md](./AGENTS.md).

```
src/
├── core/          # ports + pure domain (files, security, logging, tunnel)
├── adapters/      # cli, http, files, security, logger, tunnel
├── config/        # AppConfig
└── bin.ts         # composition root
web/               # React + Vite editor (built to dist/web/)
rest/              # REST Client .http scenarios
```


## Contributing

PRs are welcome. Read [AGENTS.md](./AGENTS.md) before you touch code — layout, dependency rules, and test conventions are strict on purpose.

## Built with AI

This project was built with AI assistance. Treat the code like any other open-source dependency — review it before you rely on it.

The rebuild story lives in [REVIEW.md](./REVIEW.md).

## License

ISC
