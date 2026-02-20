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
