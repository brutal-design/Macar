---
name: tokens-sync
description: >-
  Sync design tokens from Figma to git for this repo. Reads Figma Variables via the
  Figma MCP, writes tokens.json (W3C DTCG), runs Style Dictionary to generate
  src/styles/tokens.css, shows a diff, then commits and pushes. Use when the user says
  "tokens-sync", "sync tokens", "оновити токени з Figma", "pull tokens from Figma",
  "design tokens sync", or after Variables change in Figma.
---

# tokens-sync

Automates the design-token pipeline **Figma → `tokens.json` → `tokens.css` → git**.

## Source of truth

- **Default Figma file:** `https://www.figma.com/design/czSaBOI6oMoVEIiooPmaWK/Untitled?node-id=311-364`
  (node `311:364`). Override by passing a Figma URL as the skill argument.
- Operates on the **current git repo** (run from anywhere inside it). All paths below are
  relative to the repo root (`git rev-parse --show-toplevel`).

## Pipeline — run the steps in order

### 0 · Preconditions
1. Resolve repo root: `git rev-parse --show-toplevel`. If this fails, stop — you are not in a git repo.
2. The Figma **Dev Mode MCP** reads the file that is **open in the Figma desktop app**.
   If any Figma MCP call returns an access error, tell the user to open the file in Figma
   desktop (Dev Mode enabled) and **stop** — never invent tokens.

### 1 · EXPORT  (Figma → `tokens.json`)
1. Parse the node id from the Figma URL (`node-id=311-364` → `311:364`).
2. Call `mcp__Figma__get_variable_defs` with that node id to read all Variables.
   Optionally call `mcp__Figma__get_metadata` for the component tree (used in the report/audit).
3. Convert the result to **W3C DTCG** following `reference/mapping.md`:
   - slash paths → nested groups (`a/b/c` → `{ "a": { "b": { "c": … } } }`)
   - colors → `{ "$type": "color", "$value": "#rrggbb" }`
   - numeric space/radius → `{ "$type": "dimension", "$value": "<n>px" }`
   - `Font(...)` → `{ "$type": "typography", "$value": { fontFamily, fontWeight, fontSize, lineHeight, letterSpacing } }`
   - keep aliases as `{ "$value": "{group.path}" }` when the source token is known
4. Write the result to `tokens.json` (repo root).
   ⚠️ **Do not drop** token groups that exist in `tokens.json` but are missing from the new
   export without confirmation — see **Safety gate**.

### 2 · BUILD  (Style Dictionary → CSS)
1. If `config.js` / `config.json` is missing, copy `reference/config.template.js` → `config.js`.
2. Build: `npx style-dictionary build`  → writes `src/styles/tokens.css`.

### 3 · DIFF  (before any commit)
Run the helper (builds + prints diff + flags removals):
```bash
./.claude/skills/tokens-sync/scripts/sync.sh diff
```
Then summarize, **by token name**: added · changed · removed · renamed (old → new).

### 4 · Safety gate  (hard stop)
- If any token or CSS variable would be **removed or renamed**, show the user exactly what
  disappears and **wait for explicit confirmation**. Never delete without it.
- For a **rename**, ensure BOTH `tokens.json` and `src/styles/tokens.css` use the new name —
  edit the JSON, then rebuild so the CSS follows. Do not hand-edit `tokens.css`.

### 5 · COMMIT
```bash
./.claude/skills/tokens-sync/scripts/sync.sh commit
```
(equivalent to: `git add tokens.json src/styles/tokens.css`
→ `git commit -m "chore(tokens): sync from Figma"` → `git push`). Pushes the current branch.

### 6 · REPORT  (always end with this)
- **Total** tokens in `tokens.json`
- **Added / Changed / Removed** (counts + names)
- **Renames** (old → new)
- **Commit link** (printed by `sync.sh commit`)

## Safety rules (never violate)
- Never delete a token group, file, or CSS variable without explicit confirmation.
- Keep `tokens.json` and `tokens.css` consistent — always rebuild after editing JSON.
- If Figma can't be read, stop and report; do not fabricate or guess token values.
- MCP returns **resolved** values (alias chain flattened) and the **active mode only**
  (e.g. dark). Note this in the report when relevant.
