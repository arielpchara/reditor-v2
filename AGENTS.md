# AGENTS.md

Guidelines for AI agents (GitHub Copilot, Claude, ChatGPT, etc.) contributing code to this project.

---

## Skills

Reusable agent skills live in `skills/`. Each skill is a self-contained instruction file that defines a specific responsibility.

| Skill file | Responsibility | When to run |
|---|---|---|
| [`skills/update-readme.md`](./skills/update-readme.md) | Keep `README.md` in sync with the codebase | After every feature, domain change, new command, or API change |
| [`skills/commit.md`](./skills/commit.md) | Create descriptive git commits | After every completed task, before closing work |
| [`skills/status.md`](./skills/status.md) | Maintain the AI & Copilot usage disclosure in `README.md` | After any significant AI-generated contribution |
| [`skills/http-scenarios.md`](./skills/http-scenarios.md) | Write/update `rest/<controller>.http` scenario files | Every time an HTTP endpoint is created, changed, or removed |
| [`skills/version.md`](./skills/version.md) | Bump the version using SemVer derived from commits | Before tagging a release |

**When you finish a task that changes any user-facing behaviour, always run the `update-readme` and `http-scenarios` skills before closing the task. Then run the `commit` skill to commit the work.**

---

## Project Overview

**reditor** — edit files from your server in the browser.

A Node.js CLI tool that spins up a local HTTPS server and exposes a browser-based file editor. Run `npx reditor serve <file>` on the server and `npx reditor tunnel <user@host> --port=8080` on your laptop, then edit from the browser. OTP is off by default; pass `--enable-security` to require it.

### Scenarios

A DevOps engineer needs to edit a complex config file. The shell editor is painful. reditor provides a web UI, safely, on the local network.

- is a CLI program
- runs using npx
- runs without cloning and building the code
- is published in the npm registry
- `npx reditor serve <file> [options]`
- `npx reditor tunnel <user@host> [--port 8080]` — recommended way to reach a remote serve
- when installed should not require internet, only local network

The project follows **Hexagonal Architecture** (ports & adapters).

```
src/
├── core/                        # Domain — types, ports, pure functions (no I/O)
│   ├── files/                   # File predicates, result types, FileStore port
│   ├── security/                # OTP, JWT types, TokenService port
│   ├── logging/                 # Logger port
│   └── tunnel/                  # SSH tunnel types, ssh args, TunnelOpener port
├── adapters/                    # Implementations that talk to the outside world
│   ├── cli/                     # commander.js (program.ts, promptCreate.ts)
│   ├── http/                    # Express HTTPS server + route handlers
│   ├── files/                   # filesystem FileStore (read/write/create/validate)
│   ├── security/                # jsonwebtoken + RSA key generation
│   ├── logger/                  # winston Logger implementation
│   └── tunnel/                  # ssh spawn (TunnelOpener)
├── config/                      # AppConfig + loadConfig()
├── bin.ts                       # Composition root (npx entry)
└── index.ts                     # Public library API
web/                             # Vite + React editor UI
rest/                            # REST Client .http scenarios
```

### Dependency rule (strictly enforced)

```
adapters → core        ✅
core → adapters        ❌ never
adapters → adapters    ❌ never
config → core          ❌ never
bin.ts → adapters      ✅
bin.ts → config        ✅
bin.ts → core          ✅
```

HTTP handlers must not import `adapters/logger`, `adapters/files`, or `adapters/security`. They receive an `HttpRuntime` (`config`, `logger`, `files`, `tokens`) injected from `bin.ts`.

---

## Running the project

| Command | Description |
|---|---|
| `npm run dev` | Start HTTPS server with live reload (`--create .reditor/dev.txt`) |
| `npm run build` | Bundle CLI with esbuild → `dist/` |
| `npm run build:web` | Build the React UI → `dist/web/` |
| `npm run build:all` | Backend + web production build |
| `npm test` | Backend unit tests (Jest) |
| `npm run test:web` | Web unit tests (Vitest + jsdom) |
| `npm run test:coverage` | Tests + coverage report |
| `npm run format` | Auto-format with Prettier |
| `npm run typecheck` | TypeScript check (backend) |

### CLI usage (after build)

```bash
node dist/bin.js serve ./config.yaml
node dist/bin.js serve ./app.conf --port 8080
node dist/bin.js serve ./new.yaml --create
node dist/bin.js tunnel user@host --port 8080
npx reditor serve ./settings.json --enable-security
```

### Server (HTTPS)

- Default: `https://localhost:3000`
- Self-signed cert generated automatically when `CERT_PATH`/`KEY_PATH` are unset
- Set `USE_TLS=false` for plain HTTP (independent of OTP/JWT)
- Set `CERT_PATH` / `KEY_PATH` to use your own certs
- Set `PORT` / `HOST` to override defaults (CLI flags take precedence)
- Serves the built web UI at `/`
- API: `GET /health`, `POST /auth/exchange-token`, `GET /status`, `GET /file-meta`, `GET /file`, `PUT /file`

---

## Code conventions

### Functional Programming (FP preferred over OOP)

- **Use pure functions** — same input always produces same output, no side effects
- **Use `type`** instead of `interface` everywhere
- **Avoid classes** — use plain functions and data
- Prefer `const` for everything; `let` only when mutation is necessary
- Never use `var`
- Prefer immutable data — avoid mutating arguments

```ts
export const add = (a: number, b: number): number => a + b;
```

### TypeScript

- **Strict mode is on** — no implicit `any`, no unchecked nulls
- Use `type` not `interface`
- Never use `any` — use `unknown` and narrow with type guards
- Do not suppress errors with `@ts-ignore` without an explanatory comment
- Return types must be explicit on all exported functions
- Use discriminated unions for results: `{ ok: true; value: T } | { ok: false; error: string }`

### Logging

- The **Logger port** lives in `src/core/logging`. Winston implements it in `src/adapters/logger`.
- HTTP/CLI code logs through the injected `Logger` — never `import { logger } from '../logger'` inside another adapter
- No ad-hoc `console.log` for runtime logging (stdout banners in `bin.ts` are allowed)
- Include actionable context (endpoint, file path, status, error name/message), never secrets/tokens/OTP values

### Single Responsibility

Each file has **one reason to change**:

- `types.ts` — type definitions only, no logic
- `validator.ts` (core) — pure predicates only
- HTTP `*Handler.ts` — one handler factory per file
- `program.ts` — CLI parsing only

Do **not** add unrelated logic to an existing file. Create a new file instead.

### Code style (Prettier)

| Rule | Value |
|---|---|
| Semicolons | yes |
| Quotes | single |
| Trailing commas | all |
| Print width | 100 |
| Tab width | 2 spaces |
| Arrow parens | always |

Always run `npm run format` before finishing.

---

## Web Frontend

The `web/` directory is a standalone **Vite + React** application. Its conventions are independent of the server-side TypeScript rules above.

### Directory structure

```
web/src/
├── components/                # One directory per UI component
│   ├── App/
│   ├── Editor/
│   ├── OtpDialog/
│   ├── Toolbar/
│   ├── Toast/
│   ├── HistoryDrawer/
│   └── StatusBar/
├── __tests__/
│   ├── components/
│   ├── otpApi.test.ts
│   └── setup.ts
├── otpApi.ts                  # OTP exchange + session token storage
├── main.tsx
└── style.css
```

### Component rules

**Use function declarations, not arrow functions:**

```tsx
export function Toolbar({ filename, isDirty }: ToolbarProps): JSX.Element {
  return <div className="toolbar">...</div>;
}
```

**`forwardRef` wraps a named inner function:**

```tsx
export const Editor = forwardRef<EditorHandle, EditorProps>(
  function Editor({ language, initialContent, onChange }, ref) { ... },
);
```

**Props type named `<Component>Props`.**

**Each component imports its own CSS at the top of the file.**

### CSS — BEM

- **Block** — `.toolbar`
- **Element** — `.toolbar__filename`
- **Modifier** — `.toolbar__status--ok`
- **Never use `!important`**
- Design tokens come from CSS custom properties in `style.css`
- One CSS file per component; no cross-component style sharing

### Testing

- **Vitest** with **jsdom** (`web/vite.config.ts`)
- **React Testing Library** — query by role, label, or text, never by CSS class or id

### Adding a new component

1. Create `web/src/components/<Name>/`
2. Write `<Name>.tsx` — function declaration, `<Name>Props` type, import `./<Name>.css`
3. Write `<Name>.css` — BEM classes, use `:root` tokens from `style.css`
4. Write `index.ts` — `export { Name } from './<Name>';`
5. Write `web/src/__tests__/components/<Name>.test.tsx`

---

## Adding a new domain

1. Create `src/core/<domain>/types.ts` — types and ports only
2. Create `src/core/<domain>/` pure functions (no fs, no http, no winston)
3. Create `src/core/<domain>/index.ts` — barrel export
4. Create `src/adapters/<domain>/` for I/O implementations of the port
5. Create `src/adapters/http/<domain>Handlers.ts` if it has HTTP endpoints
6. Register new routes in `src/adapters/http/routes.ts` and wire deps in `bin.ts`
7. Write tests in `src/__tests__/core/<domain>/` and `src/__tests__/adapters/`
8. Export from `src/index.ts` if it's part of the public library API

---

## Testing

- Backend: **Jest** with **ts-jest**
- Web: **Vitest** + jsdom
- Test files live in `src/__tests__/` mirroring `src/`:

```
src/__tests__/
├── core/
│   ├── files/
│   └── security/
├── config/
└── adapters/
    ├── cli/
    ├── files/
    ├── security/
    └── http/
```

- Tests are **excluded** from the production build
- Every exported function must have unit tests
- Test both happy path and error/edge cases
- HTTP handler tests inject a silent logger via `src/__tests__/adapters/http/testRuntime.ts`

### Test conventions

```ts
describe('functionName', () => {
  it('does X when Y', () => { ... });
  it('throws when Z', () => { ... });
});
```

---

## Dos and Don'ts

**Do:**

- Keep `core/` free of any framework or I/O dependency (`fs`, `express`, `winston`, `jsonwebtoken`)
- Inject `HttpRuntime` into HTTP handlers — never import another adapter from HTTP
- Write tests for every new function
- Run `npm run format` and `npm test` before considering work done
- Use discriminated union result types for operations that can fail
- Export all public API from `src/index.ts`

**Don't:**

- Import from `adapters/` inside `core/`
- Import one adapter from another adapter
- Add `"type": "module"` to `package.json` — the project uses CommonJS
- Edit files in `dist/` directly
- Use `require()` directly in `.ts` source files
- Commit failing tests or a broken build
