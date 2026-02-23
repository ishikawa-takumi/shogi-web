Review and simplify recently changed code.

## Changed files

```
$(/usr/bin/git diff --name-only 2>/dev/null)
$(/usr/bin/git diff --cached --name-only 2>/dev/null)
```

## Instructions

For each changed `.ts` / `.tsx` file:

1. Read the file
2. Look for:
   - Unnecessary complexity (nested ternaries, over-abstraction)
   - Verbose patterns that could be simpler
   - Repeated logic that should be extracted
   - Overly defensive code (checks that can't fail)
   - Dead code or unused imports
3. Simplify while preserving ALL existing behavior
4. Keep changes minimal — only simplify, don't refactor architecture

Rules:
- Do NOT add comments, docstrings, or type annotations that weren't there
- Do NOT change public interfaces
- Do NOT add error handling beyond what exists
- Prefer fewer lines over "clever" code
