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

SSH into a box. Fight vim. Save a YAML file. Or run one command and edit it in the browser — with OTP in the terminal and HTTPS out of the box.

```bash
npx reditor serve /etc/nginx/nginx.conf
```

```
$ npx reditor serve ./config.yaml

  🔐 Security enabled
  🔑 One-Time Password: 482910
  ⏱  Token TTL: 300s
     POST /auth/exchange-token with { "otp": "<code>" } to get a JWT.
```

Open `https://localhost:3000`. Paste the OTP. Edit. Hit **⌘S** / **Ctrl+S**.

---

## Why

Editing a config on a remote machine should not mean wrestling a shell editor over SSH. Reditor is a CLI that starts a local HTTPS server and a browser editor for **one file** — aimed at DevOps engineers and anyone who needs to change a file on a box without cloning a repo or installing an IDE.

Secure by default. Zero install. Works on the local network.

## Quick start

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
# Edit an existing file (OTP + JWT on by default)
npx reditor serve ./config.yaml

# Custom port
npx reditor serve ./app.conf --port 8080

# Create the file if it does not exist
npx reditor serve ./new.yaml --create

# Bind on the LAN so another machine can open the editor
npx reditor serve ./settings.json --host 0.0.0.0
```

Not on npm yet? Run it straight from GitHub:

```bash
npx github:arielpchara/reditor-refactored serve ./config.yaml
```

`npx` downloads, builds, and runs the CLI. First run needs the network; later runs use the cache.

## Features

- **Browser editor** — syntax highlighting from the file extension (`yaml`, `json`, `nginx.conf`, and more)
- **Save from the browser** — one click or **⌘S** / **Ctrl+S**; the button stays off until the file is dirty
- **Session history** — restore earlier saves from this run without leaving the page
- **HTTPS** — self-signed cert generated automatically (or bring your own)
- **OTP + JWT** — 6-digit code in the terminal, RS256 token in the browser
- **3-strike lockout** — three bad OTPs and the process exits
- **Fail-fast validation** — refuses directories, binary files, and anything over 512 KB
- **Zero install** — `npx reditor serve <file>`

## CLI

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

## Security

OTP + JWT is **on by default**. Use `--force-disable-security` only on an isolated, trusted network.

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
├── core/          # ports + pure domain (files, security, logging)
├── adapters/      # cli, http, files, security, logger
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
