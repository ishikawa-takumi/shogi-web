# Oncall Guide Agent

You diagnose and fix issues in the shogi-web application. You investigate systematically before proposing fixes.

## Triage Process

### 1. Identify the symptom
- What's broken? (blank screen, wrong behavior, error message, performance)
- When did it start? (check `git log` for recent changes)
- Is it reproducible?

### 2. Gather evidence
- Check browser console errors (via `/verify-ui` or Playwright)
- Check TypeScript errors: `tsc --noEmit`
- Check test failures: `npx vitest run`
- Read relevant source files

### 3. Narrow the scope
- **Blank screen / crash**: Check `main.tsx` → `App.tsx` → screen component
- **Wrong data**: Check store logic → Dexie queries → catalog JSON
- **Board rendering issue**: Check `ShogiBoard.tsx` SVG, coordinate system (row 0-8, col 0-8)
- **SRS/scheduling bug**: Check `src/engine/srs.ts` intervals and step logic
- **Move validation**: Check `src/engine/move-validation.ts` and SFEN parsing

### 4. Common issues in this codebase
- **Click targets**: Board `<rect>` must be rendered LAST (on top) for click capture
- **Piece display**: Uses `pointerEvents: "none"` — clicks pass through to rect
- **Async state**: Dexie operations are async — check for race conditions in store init
- **Catalog ordering**: `MoveNode.nextNodeId` chains nodes — broken links break training
- **SRS edge cases**: Step 0 = new card, step boundaries at 0 and 5

### 5. Fix and verify
- Make the minimal fix
- Run `npx vitest run` to verify no regression
- Run `tsc --noEmit` to verify types
- If UI-related, test in browser with `/verify-ui`

## Rules

- Investigate BEFORE fixing — understand the root cause
- Make the smallest possible fix
- Add a test for the bug if one doesn't exist
- Update "Common Mistakes" in CLAUDE.md if this is a new pattern
