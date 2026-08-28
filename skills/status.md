# Skill: status

## Purpose

Maintain two things in the repository:

1. **`ai-sessions.json`** — a machine-readable log of every AI session
2. **A short AI disclaimer in `README.md`** — one paragraph, then a link to [REVIEW.md](../REVIEW.md)

The product README is a landing page. Session metrics, token counts, and authorship tables do **not** belong there. Put the narrative in `REVIEW.md` and the structured log in `ai-sessions.json`.

---

## When to activate this skill

Activate at the **end of every AI session** (before the final commit), or when:

- A new AI session starts and the previous one wasn't logged
- The LLM being used changes mid-session
- A human reviewer asks for an up-to-date usage report

---

## How to execute this skill

### Step 1 — Gather session data

Collect the following information:

| Field | How to get it |
|---|---|
| `date` | Today's date (`date -I`) |
| `llm` | The model currently in use (ask the AI agent itself: "which model are you?") |
| `session_start` | Timestamp of the first commit in this session (`git log --reverse --format="%ai" \| head -1`) |
| `session_end` | Timestamp of the latest commit (`git log -1 --format="%ai"`) |
| `duration_minutes` | Difference between start and end in minutes |
| `commits` | All commit SHAs with `Co-authored-by: Copilot` in this session |
| `tokens_input` | Total input tokens if exposed by the AI tool; otherwise `null` |
| `tokens_output` | Total output tokens if exposed by the AI tool; otherwise `null` |
| `summary` | One sentence describing what was built this session |

> Token counts are **not always available** from the AI tool interface.
> Record them when known; set to `null` otherwise and note "Not available from this interface".

### Step 2 — Update `ai-sessions.json`

Append a new entry to the sessions array:

```json
{
  "date": "YYYY-MM-DD",
  "llm": "<model name and ID>",
  "session_start": "YYYY-MM-DDTHH:MM:SS",
  "session_end": "YYYY-MM-DDTHH:MM:SS",
  "duration_minutes": 0,
  "tokens_input": null,
  "tokens_output": null,
  "commits": ["<sha1>", "<sha2>"],
  "summary": "<one sentence>"
}
```

### Step 3 — Compute cumulative stats

From `ai-sessions.json` calculate:

- **Total sessions** — count of entries
- **Total duration** — sum of all `duration_minutes`
- **Total commits** — count of all commits across all sessions
- **Models used** — unique list of `llm` values
- **Total tokens** — sum of known tokens; note "partial" if any sessions have `null`

Keep these numbers in `ai-sessions.json` (and optionally `REVIEW.md`). Do not paste them into `README.md`.

### Step 4 — Keep the README disclaimer short

The **Built with AI** section in `README.md` must stay this shape. Do not grow it.

```markdown
## Built with AI

This project was built with AI assistance. Treat the code like any other open-source dependency — review it before you rely on it.

The rebuild story lives in [REVIEW.md](./REVIEW.md).
```

If `REVIEW.md` needs a longer session log, update that file instead.

---

## Quality rules

- Never restore the old **AI & Copilot Usage** metrics / session table into `README.md`
- Never remove the short **Built with AI** section from `README.md`
- Token counts: always be honest — `null` is better than a guess
- `ai-sessions.json` is the source of truth for metrics
- `README.md` only discloses that AI was used, then points at `REVIEW.md`
