# Shogi Web Trainer

Japanese shogi (将棋) opening trainer SPA with spaced repetition.

## Quick Commands

```bash
npm run dev        # Start dev server (Vite)
npm run build      # Type-check + production build
npm run lint       # ESLint
npx vitest run     # Run all tests once
npx vitest         # Watch mode
```

## Tech Stack

- **React 19** + **TypeScript 5.9** (strict mode, `erasableSyntaxOnly`)
- **Vite 7** — build & dev server
- **Tailwind CSS 4** — v4 import-based (`@import "tailwindcss"` in `index.css`, no config file)
- **Zustand 5** — client state (5 stores in `src/store/`)
- **Dexie 4** — IndexedDB persistence (3 tables in `src/db/schema.ts`)
- **Vitest 4** — testing with jsdom environment

## Architecture

```
src/
├── main.tsx              # React root
├── App.tsx               # Screen router + initialization + session orchestration
├── components/           # Presentational components (props-driven, no store access)
│   ├── board/            # ShogiBoard (SVG renderer)
│   ├── layout/           # NavBar
│   └── training/         # CoachPanel, QAChat, SessionProgress, SessionSummary
├── screens/              # Top-level screen components
├── store/                # Zustand stores (catalog, review, session, settings, dashboard)
├── db/                   # Dexie schema + per-table CRUD modules
├── engine/               # Pure logic (SRS, SFEN parser, move validation, hints, catalog)
├── types/                # All type definitions (re-exported via index.ts)
└── utils/                # Coord conversion, date helpers, piece labels
tests/engine/             # Unit tests for engine modules (~46 tests)
content/                  # Static catalog JSON
```

### Key Patterns

- **No router library** — navigation via `useState<Screen>` in `App.tsx`
- **Props-driven components** — screens receive callbacks from App; no direct store access in components
- **Immutable state** — all types use `readonly`, stores use spread updates, never mutate
- **Pure engine layer** — `src/engine/` has zero React/DOM dependencies, fully testable
- **Linked-list catalog** — `MoveNode.nextNodeId` chains nodes in sequence per opening line
- **Dev-only Q&A** — `codex-plugin.ts` adds `POST /api/qa` to Vite dev server (not in production build)

### State Flow

```
App.tsx (orchestrator)
  ├── useCatalogStore   → loads content/opening_catalog_v1.json
  ├── useSettingsStore   → reads/writes Dexie settings table
  ├── useReviewStore     → in-memory ReviewCard[] synced to Dexie
  ├── useSessionStore    → queue management, submitMove(), advance()
  └── useDashboardStore  → computed stats from cards + session history
```

Stores call Dexie directly for persistence. App.tsx reads store state and passes to screens as props.

### SRS Algorithm

Located in `src/engine/srs.ts`:
- 6 ease steps (0–5) mapping to intervals: 0d, 1d, 3d, 7d, 14d, 30d
- Correct → step up (capped at 5); Incorrect → step down to max(step-1, 1), interval = 1d
- Session queue: mistakes first, then due cards (80%), then new cards (20%)
- New cards gated by predecessor mastery (sequential ordering)

### Board Rendering

`ShogiBoard.tsx` renders a pure SVG board. Key detail:
- Click target `<rect>` is rendered LAST (on top) to capture all clicks
- Pieces and legal-move dots use `pointerEvents: "none"`
- Coordinate system: `row 0–8`, `col 0–8` (top-left origin)

## Content

Catalog lives in `content/opening_catalog_v1.json`:
- 4 families: 相掛かり, 矢倉, 後手の基本受け, 詰将棋（1手）
- 27 total nodes, each with SFEN, expected moves (USI), tags, and teachingComment

## Database Schema (Dexie)

Database name: `"shogi-trainer"`, version 1

| Table | Key | Purpose |
|-------|-----|---------|
| `reviewCards` | `nodeId` | SRS card state per catalog node |
| `sessionHistory` | `++id` | Daily session logs |
| `settings` | `id` (singleton=1) | User preferences |

## Conventions

- All source files use `.ts` / `.tsx` extensions in imports
- Japanese UI text throughout (将棋 domain)
- Types in `src/types/`, re-exported from `src/types/index.ts`
- Test files mirror source structure: `tests/engine/*.test.ts`
- No `test` script in package.json — use `npx vitest run` directly

## Claude Code Workflow

### Slash Commands (`.claude/commands/`)

| Command | Purpose |
|---------|---------|
| `/commit` | Stage + commit with pre-computed git context |
| `/verify` | Run build + lint + tests, report summary |
| `/verify-ui` | Test app in real browser via Playwright |
| `/simplify` | Simplify recently changed code |
| `/plan` | Plan-first mode: explore, design, then implement |

### Subagents (`.claude/agents/`)

| Agent | Purpose |
|-------|---------|
| `code-simplifier` | Simplify code after implementation |
| `verify-app` | Full verification: static analysis + tests + browser + content |

### Hooks

- **PostToolUse**: `eslint --fix` on `.ts`/`.tsx` after Edit/Write
- **Stop**: Typecheck + lint + tests + console.log audit on session end

### Workflow

1. Start with `/plan` or Shift+Tab x2 (Plan mode) for non-trivial tasks
2. Iterate on the plan until satisfied
3. Switch to auto-accept edits and implement
4. Run `/verify` to check everything passes
5. Run `/simplify` to clean up
6. Run `/commit` to commit with a good message

## Common Mistakes

<!-- Add entries here when Claude makes a mistake, so it learns not to repeat them. -->
<!-- Format: "Do X, not Y" with a brief explanation. -->

- Do NOT mutate state — always use spread (`{ ...obj, key: value }`), never `obj.key = value`
- Do NOT import from `react-router` — this app uses `useState<Screen>` for navigation
- Do NOT add a Tailwind config file — v4 uses `@import "tailwindcss"` in CSS, no config
- Do NOT use `any` in source files — use `unknown` and narrow with type guards
- Do NOT access Zustand stores from components — components are props-driven, only screens/App use stores
- Do NOT add `console.log` — the Stop hook will flag it
