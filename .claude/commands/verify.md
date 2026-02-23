Run the full verification suite and report results.

## Pre-computed results

TypeScript:
```
$(cd /Users/takumiishikawa/work/shogi-web && npx tsc --noEmit -p tsconfig.app.json 2>&1 | tail -20)
```

Lint:
```
$(cd /Users/takumiishikawa/work/shogi-web && npm run lint 2>&1 | tail -20)
```

Tests:
```
$(cd /Users/takumiishikawa/work/shogi-web && npx vitest run 2>&1 | tail -30)
```

## Instructions

Summarize the verification results:
- List any TypeScript errors with file:line
- List any lint violations
- List any test failures with the test name and reason
- If everything passes, confirm with a short summary

If there are failures, suggest fixes for the most critical issues first.
