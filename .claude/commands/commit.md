Create a commit for the staged/unstaged changes.

## Current state

Status:
```
$(/usr/bin/git status --short)
```

Diff summary:
```
$(/usr/bin/git diff --stat 2>/dev/null)
$(/usr/bin/git diff --cached --stat 2>/dev/null)
```

Recent commits (match this style):
```
$(/usr/bin/git log --oneline -5)
```

## Instructions

1. Review the diff to understand what changed
2. Stage the relevant files (be specific, don't use `git add -A`)
3. Write a conventional commit: `<type>: <description>`
   - Types: feat, fix, refactor, docs, test, chore, perf
   - Description: concise, lowercase, imperative mood
4. Do NOT include Co-Authored-By
5. If nothing to commit, say so
