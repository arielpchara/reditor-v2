# Skill: update-readme

## Purpose

Maintain `README.md` as the **product** page for Reditor — the human-facing, open-source landing doc.
Every time you add a feature, change a domain, add a command, or modify a configuration option — **rewrite the relevant README sections** before considering the task done.

The README is a landing page, not a spec. Hero and quick start come first. API, config, and architecture stay compact.

---

## When to activate this skill

Activate **automatically** when any of these conditions are met:

- A new domain module is added under `src/core/`
- A new CLI command is added to `src/bin.ts`
- A new HTTP route is added to `src/adapters/http/routes.ts`
- The server configuration changes (`src/config/`)
- A new npm script is added to `package.json`
- The public API exported from `src/index.ts` changes
- The `web/` UI gains or loses a user-facing feature
- Any existing behaviour described in the README is changed

---

## How to execute this skill

### Step 1 — Gather context

Before writing, read the following sources to understand the current state of the project:

| Source | What to extract |
|---|---|
| `package.json` | `name`, `version`, `description`, `bin`, `scripts` |
| `src/index.ts` | All public exports (library API) |
| `src/bin.ts` / `src/adapters/cli/program.ts` | All CLI commands and options |
| `src/adapters/http/routes.ts` | All HTTP endpoints |
| `src/core/**/types.ts` | Domain types (infer features from these) |
| `src/config/types.ts` + `src/config/index.ts` | Env vars and defaults |
| `web/src/components/` | User-facing editor features |
| `AGENTS.md` | Architecture pattern |

### Step 2 — Keep the product voice

- Display name is **Reditor**. CLI / npm name is `reditor`.
- Heading is `# Reditor` (capital R). Commands stay `npx reditor …`.
- Write in plain English. Short sentences. No jargon unless the CLI already uses it.
- Do **not** invent capabilities that don't exist in code.
- Do **not** document `--force-otp` (test-only).
- Terminal demos must match real stdout from `src/bin.ts`.
- Every bash example must actually work.

### Step 3 — Patch the matching section

Apply the template below. Replace **only** the sections that changed. Do not restyle the hero, drop the ASCII logo, or turn the README back into a per-route API spec.

| Change | README section to update |
|---|---|
| New UI / domain feature | Features (one short bullet) |
| New CLI flag or command | CLI table + Quick start example if it is a common path |
| New or removed HTTP route | HTTP API table (one row, not a full subsection) |
| New env var | Configuration table |
| New npm script | Development |
| Positioning / name | Why + hero tagline |

---

## README template

Use this exact structure. Do not add or remove top-level sections unless the product scope changes.

```markdown
# Reditor

\`\`\`
 ____          _ _ _
|  _ \ ___  __| (_) |_ ___  _ __
| |_) / _ \/ _` | | __/ _ \| '__|
|  _ <  __/ (_| | | || (_) | |
|_| \_\___|\__,_|_|\__\___/|_|
\`\`\`

**Edit files from your server in the browser.**

<!-- badges -->

> Why-it-exists — 2–4 sentences. Who it is for.

\`\`\`bash
npx reditor serve <file>
\`\`\`

<!-- terminal demo matching src/bin.ts stdout -->

## Why

## Quick start

## Features

<!-- Short bullets. Not one ### per domain module. -->

## CLI

## Security

## Configuration

## HTTP API

<!-- One table: method, path, auth, purpose. Not per-route essays. -->

## Development

<!-- Scripts + pointer to AGENTS.md. Keep the src/ tree. -->

## Contributing

## Built with AI

<!-- Short disclaimer only. Do not restore session metrics. See skills/status.md. -->

## License

ISC
```

---

## Quality rules

- Every code example in the README must actually work with the current codebase
- Never document a feature that hasn't been implemented yet
- Never leave stale examples from deleted features
- Use `bash` fences for shell commands, `text` for ASCII / terminal demos
- Keep the README scannable — prefer tables and short sentences over paragraphs
- Do not reintroduce the long **AI & Copilot Usage** session log
- Do not expand HTTP API back into per-route request/response dumps
