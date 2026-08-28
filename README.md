# reditor

> Edit files from your server in the browser. Run `npx reditor serve <file>` on any machine and access a web-based file editor from any browser — with optional HTTPS and OTP-secured access.

## Features

- **Browser file editor** — React-based UI with `prism-code-editor` and syntax highlighting auto-detected from file extension
- **Save from the browser** — edit and save changes back to the server with a single click
- **HTTPS server** with auto-generated self-signed certificate
- **Browser OTP dialog** — terminal-styled centred dialog at startup; shows attempt counter (N/3), loading spinner during exchange, error on failure, and fatal screen after 3 bad attempts
- **OTP rate limiting** — server crashes (`process.exit(1)`) after 3 failed OTP attempts, preventing brute-force access
- **JWT authentication** — exchange OTP for a signed RS256 JWT token
- **Configurable token TTL** — default 5 minutes, customisable via CLI
- **Ephemeral RSA signing keys** — generated in memory for the process lifetime; JWTs from a previous run cannot be reused
- **Winston logging** — structured logs to console and `logs/reditor-<timestamp>.log`
- **Startup file validation** — fails fast with a descriptive error if the file is missing, a directory, too large, or binary

## Quick Start

No installation needed. Run directly from GitHub with `npx`:

```bash
# Edit a file — runs the latest version straight from the repository
npx github:arielpchara/reditor-refactored serve <file>
```

> **How it works:** `npx` downloads the repository, runs `npm run build` automatically (triggered by the `prepare` script), then executes the CLI. Requires Node.js ≥ 18 and an internet connection on first run. Subsequent runs use the npm cache.

### Examples

```bash
# Edit a remote config file with default security (OTP + JWT)
npx github:arielpchara/reditor-refactored serve /etc/nginx/nginx.conf

# Use a custom port
npx github:arielpchara/reditor-refactored serve ./app.conf --port 8080

# Create the file if it doesn't exist yet
npx github:arielpchara/reditor-refactored serve ./new-config.yaml --create

# Disable security on a fully trusted local network
npx github:arielpchara/reditor-refactored serve ./settings.json --force-disable-security
```

---

## Installation

```bash
npm install
npm run build
```

## CLI Usage

```bash
npx reditor serve <file> [options]
```

| Argument / Option | Default | Description |
|---|---|---|
| `<file>` | **required** | Path to the file to edit in the browser |
| `-p, --port <port>` | `3000` | Port the server listens on |
| `-H, --host <host>` | `localhost` | Host the server binds to |
| `--force-disable-security` | `false` | **[DANGER]** Disable OTP and JWT auth — anyone on the network can read the file |
| `--token-ttl <seconds>` | `300` | JWT token time-to-live in seconds |
| `--force-otp <otp>` | — | **[TEST ONLY]** Override the generated OTP with a fixed value |
| `--create` | `false` | Create the file if it does not exist (skips the confirmation prompt) |
| `-h, --help` | — | Display help |

### Examples

```bash
# Edit a file (OTP + JWT security enabled by default)
npx reditor serve ./config/server.conf

# Edit a file on a custom port
npx reditor serve ./config/server.conf --port 8080

# Edit a file with security DISABLED (dangerous — use only on trusted networks)
npx reditor serve ./config/server.conf --force-disable-security

# Edit a file with a 10-minute token TTL
npx reditor serve ./config/server.conf --token-ttl 600
```

> **Startup validation:** if `<file>` is omitted, not found, is a directory, exceeds 512 KB, or contains binary content, the program logs a descriptive error and exits before starting the server.

When security is active (default), startup output includes:

```
  🔐 Security enabled
  🔑 One-Time Password: 482910
  ⏱  Token TTL: 300s
     POST /auth/exchange-token with { "otp": "<code>" } to get a JWT.
```

## HTTP API

### `GET /health`

Returns server status and whether security is enabled. Always accessible — no auth required. Used by the browser UI to decide whether to show the OTP dialog.

```bash
curl https://localhost:3000/health
# → {"status":"ok","securityEnabled":true}
```

### `POST /auth/exchange-token` *(only registered when security is enabled)*

Exchange the OTP printed at startup for a signed RS256 JWT token. After **3 failed attempts** the server logs a fatal error and exits, preventing brute-force access.

**Request:**

```json
{ "otp": "482910" }
```

**Response (200):**

```json
{ "token": "<JWT>", "expiresIn": 300 }
```

**Errors:**

| Status | Reason |
|---|---|
| `401` | Missing or incorrect OTP (`attemptsLeft` field shows remaining tries) |
| `401` | OTP has already been used (OTP is single-use) |
| `404` | Route is not registered when security is disabled |
| `500` | Signing key not available |

Use the returned `token` as a `Bearer` header for subsequent requests.

### `GET /file-meta`

Returns metadata about the configured file. Used by the browser UI to set the editor language and title.

```bash
curl https://localhost:3000/file-meta
# → {"filename":"server.conf"}
```

**Errors:** `401` when security is enabled and the token is missing or invalid.

### `GET /file`

Returns the raw content of the file configured at startup (`<file>` argument). Requires a valid JWT in the `Authorization` header when security is active (default).

```bash
# Without security
curl https://localhost:3000/file

# With security
curl https://localhost:3000/file \
  -H "Authorization: Bearer <token>"
```

**Validations:**

| Status | Condition |
|---|---|
| `200` | File is readable, ASCII, within size limit |
| `401` | Security enabled and token missing or invalid |
| `404` | File no longer exists on disk |
| `413` | File exceeds 512 KB (prism-code-editor performance limit) |
| `422` | File contains non-ASCII bytes |
| `500` | Unexpected read error |

> **Why 512 KB?** [prism-code-editor](https://github.com/jonpyt/prism-code-editor) starts to slow down beyond ~1000 LOC on most hardware. 512 KB gives comfortable headroom for that many lines.

### `PUT /file`

Saves new content back to the file on disk. Requires a valid JWT when security is enabled. Returns `204 No Content` on success.

**Request:**

```json
{ "content": "updated file text…" }
```

**Errors:**

| Status | Condition |
|---|---|
| `400` | `content` field missing or not a string |
| `401` | Security enabled and token missing or invalid |
| `413` | Content exceeds 512 KB |
| `500` | Unexpected write error |

## Security

Security (OTP + JWT) is **enabled by default**. Use `--force-disable-security` only on isolated, trusted networks.

When security is active:

1. An **RSA-2048 key pair** is generated in memory for this process (not written to disk). Restarting the server invalidates all existing JWTs.
2. A **6-digit OTP** is generated using `crypto.randomInt` (cryptographically secure).
3. The OTP is valid for a **single successful exchange** in the current process lifetime.
4. Tokens are signed with **RS256** and expire after `--token-ttl` seconds.
5. After **3 failed OTP attempts** the process exits. Binding to a non-loopback host prints a warning because this is a denial-of-service vector.

## Configuration

Environment variables (all optional — CLI flags take precedence):

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the server listens on |
| `HOST` | `localhost` | Hostname the server binds to |
| `USE_TLS` | `true` | Set to `false` to use plain HTTP (independent of OTP/JWT) |
| `CERT_PATH` | — | Path to TLS certificate file (PEM). If unset, a self-signed cert is generated |
| `KEY_PATH` | — | Path to TLS private key file (PEM) |

## Development

```bash
npm run dev           # start server with live reload (nodemon + ts-node)
npm run build:web     # build the browser UI (web/ → dist/web/)
npm run build         # compile TypeScript → dist/
npm run build:all     # build:web then build (full production build)
npm test              # run unit tests
npm run test:coverage # tests + coverage report
npm run test:web      # run web UI unit tests (Vitest + jsdom)
npm run typecheck     # TypeScript type-check without emit
```

Runtime logs are written to:

```bash
logs/reditor-<ISO_TIMESTAMP>.log
```

## Architecture

This project follows **Hexagonal Architecture** (Ports & Adapters).
See [AGENTS.md](./AGENTS.md) for full conventions and contribution guidelines.

```
src/
├── core/          # ports + pure domain (files, security, logging)
├── adapters/      # cli, http, files (fs), security (jwt/keys), logger (winston)
├── config/        # AppConfig
└── bin.ts         # composition root
web/               # React + Vite editor UI (built to dist/web/)
rest/              # REST Client .http scenarios
```

## ⚠️ AI & Copilot Usage

This project was built with the assistance of **GitHub Copilot** and other AI tools.

> **Disclaimer:** AI-generated content may contain errors, security vulnerabilities,
> incorrect logic, or outdated practices. All code, configuration, and documentation
> in this repository should be reviewed and validated by a qualified human developer
> before being used in any production environment.

### AI Session Summary

| Metric | Value |
|---|---|
| Total AI sessions | 3 |
| Total AI time | ~6h |
| AI commits | 8 |
| Models used | Claude Sonnet 4.6 (`claude-sonnet-4.6`) via GitHub Copilot CLI |
| Tokens (input / output) | Not available from the GitHub Copilot CLI interface |
| Last session | 2026-03-12 |

### Session Log

| Date | Model | Duration | Commits | Summary |
|---|---|---|---|---|
| 2026-03-12 | Claude Sonnet 4.6 | ~2h | 2 | Security UI: terminal-styled OTP dialog (3 retries, spinner, fatal screen), server OTP rate-limit + crash after 3 failures, `securityEnabled` in `/health`, Vitest + jsdom tests for web module |
| 2026-03-12 | Claude Sonnet 4.6 | 2h 22m | 4 | Full project bootstrap: scaffold, Hexagonal Architecture, Express HTTPS server, CLI with commander.js, `--enable-security` OTP, git hooks, agent skills |
| 2026-03-12 | Claude Sonnet 4.6 | ~1.5h | 2 | Security feature: `POST /auth/exchange-token`, RSA-2048 key pair generation, RS256 JWT signing, `--token-ttl`, `--keys-dir` CLI params, 23 unit tests |

## License

ISC
