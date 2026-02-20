# Shogi Web Trainer (将棋ウェブトレーナー)

An interactive browser-based shogi opening trainer that uses spaced repetition to help beginners learn opening moves, castle formations, and basic tsume (checkmate) puzzles.

## Features

- **Opening training** — step through 相掛かり (Aigakari), 矢倉 (Yagura), and 後手 (Gote) opening sequences
- **Tsume puzzles** — 1-move checkmate problems using all piece types
- **Spaced repetition** — SRS algorithm schedules reviews based on your accuracy
- **Interactive SVG board** — click-to-move with legal move hints and promotion prompts
- **Teaching comments** — Japanese explanations shown after each correct answer
- **AI Q&A** — ask questions about the current position (dev server only, requires Codex CLI)
- **Progress tracking** — dashboard with mastery bars, streaks, and rank progression
- **Offline-first** — all data stored in IndexedDB via Dexie

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) + production build |
| `npm run lint` | Run ESLint |
| `npx vitest run` | Run test suite |
| `npx vitest` | Run tests in watch mode |

## Tech Stack

- React 19 + TypeScript 5.9
- Vite 7
- Tailwind CSS 4
- Zustand 5 (state management)
- Dexie 4 (IndexedDB)
- Vitest 4 (testing)

## Project Structure

```
src/
├── components/     UI components (board, training widgets, layout)
├── screens/        Top-level screen views
├── store/          Zustand stores (catalog, review, session, settings, dashboard)
├── db/             Dexie schema and per-table data access
├── engine/         Pure logic (SRS, SFEN parsing, move validation, hints)
├── types/          TypeScript type definitions
└── utils/          Coordinate conversion, date helpers, piece labels

content/            Static opening catalog (JSON)
tests/              Unit tests for engine modules
```

## License

Private project.
