# CLAUDE.md

Working rules for the Veltrio user portal (React 19 · TypeScript · Vite · TanStack Query).
The API repo has its own CLAUDE.md; when a change spans both, follow each repo's file.

## 1. Comments: two lines, and only the why

**One or two lines. Explain why, never what.**

The code already says what it does. A comment earns its place only when it carries something
the reader cannot see: a constraint, a consequence, a reason the obvious approach was wrong.

```ts
// Good — a fact the code cannot show:
// Keyed on vehicle id, not plate: plates are not unique, so a plate lookup could show the
// wrong car's photo.

// Bad — restates the signature:
// Loops over the vehicles and builds a map of id to thumbnail url.
```

Rules:
- Two lines is the ceiling for an inline comment. Four or five means the point is being restated.
- One non-obvious fact per comment. Drop the supporting narration.
- Cut anything derivable from the name or type. "Several can be held at once" above a `list`
  endpoint is padding.
- Module and exported-function docstrings may run longer, but only for a multi-step flow or a
  security property — not to repeat the inline comments below them.
- This file sits at ~8.7% comment lines. Match the file you are editing.

## 2. Verify, don't assert

**Claims about behaviour need evidence in the transcript.**

- A fix is not done until something fails without it and passes with it. For a bug fix, say
  which check proves it.
- Never claim a test is meaningful without seeing it fail first. A test that passes before the
  fix is testing nothing — rewrite it.
- Check real data before trusting an assumption about shape or uniqueness. Query the database
  or hit the endpoint; do not infer it from a type.
- Report outcomes as they are. If something is unverified, say so plainly rather than implying
  it was checked.

## 3. Surgical changes

**Every changed line traces to the request.**

- Don't improve adjacent code, comments, or formatting.
- Match the surrounding style even where you'd write it differently.
- Remove imports and helpers *your* change orphaned; leave pre-existing dead code alone and
  mention it instead.
- Extending a change to a sibling (a second table, the other locale) is often right — do it,
  then say you did and why, so it can be scaled back.

## 4. Layering

**`.api.ts` → `.mapper.ts` → hooks → components.**

- `<module>/api/<name>.api.ts` — URLs and HTTP only.
- `<module>/api/<name>.mapper.ts` — every wire type and mapper for the module, in one file.
  Wire ↔ portal translation lives here: enum slugs, cents ↔ dollars, `null` ↔ `undefined`.
- `<module>/hooks/` — TanStack Query. Query keys are exported from the hook file.
- `<module>/utils/` — pure functions. Prefer extracting a decision here over testing it
  through a large component.
- `<module>/types/`, `<module>/schema/` — types and Zod schemas.
- `<module>/constants/` — module constants. Cross-module ones live in `src/lib/` (page sizes
  in `lib/pagination.ts`). Search before defining: a second copy of a value is how two screens
  drift apart.

## 4a. Reuse before you build

- Check `src/components/{ui,forms,feedback,layout,data-display,navigation}` before writing a
  component. Loading, empty and error states use `LoadingState`, `EmptyState`, `ErrorState`.
- No native `<select>`, `<table>`, date or time inputs in modules or pages; the `ui/` versions
  carry focus handling and styling the native ones lack.
- A pattern appearing a second time in a module is the moment to extract it, not the third.

## 5. i18n

- No user-visible string in a component. Every label is a key.
- `en` and `es` change together, always. A key added to one and not the other is a bug.
- Keys are typed: a missing key is a tsc error, so let the compiler find them.

## 6. Before saying it's done

While iterating, run only what the change touches — `npx vitest related <changed files> --run`
(~7s) — not the full suite after every edit. Run the full gate once, at the end, and report the
real numbers:

```
npx tsc -b                # must be silent (tsc --noEmit checks nothing here: the root tsconfig has no files)
npx vitest run            # all green
npx eslint src --ext .ts,.tsx   # 0 errors (warnings are pre-existing; don't let the count grow)
```

For anything touching a table, a form, or the router, also `npx vite build`.

Writing tests:
- Put a decision in `utils/` and test it there; a `.ts` test is milliseconds, a component test
  is seconds. Component tests are for interaction regressions (focus, typing, submit).
- `userEvent.setup({ delay: null })` — same per-key events, without a timer wait per key.
- Pin the clock (`vi.setSystemTime`) in any test whose code reads today's date.
Say what you did *not* verify — a browser click-through, in particular, unless you did one.

## 7. Git

**Never commit.** Leave changes in the working tree for review.
