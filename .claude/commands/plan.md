Design an implementation plan before writing code.

## Context

Current branch:
```
$(/usr/bin/git branch --show-current)
```

Recent changes:
```
$(/usr/bin/git log --oneline -10)
```

Modified files:
```
$(/usr/bin/git status --short)
```

## Instructions

You are in plan-first mode. Do NOT write any code yet.

1. **Clarify** — Ask questions about anything ambiguous in the request
2. **Explore** — Read relevant files to understand the current architecture
3. **Plan** — Write a numbered step-by-step plan covering:
   - Which files to create/modify
   - What changes in each file
   - Dependencies between steps (what must happen first)
   - What can be parallelized
   - How to verify the result
4. **Present** — Show the plan and wait for approval before implementing

Rules:
- Each step should be small enough to verify independently
- Identify risks and call them out
- If the task is simple (< 3 steps), say so and ask if planning is needed
- Reference specific files and line numbers when possible
