@AGENTS.md

# Working in this repository

Asset Manager Cloud is a household finance app (Next.js, Supabase and Vercel)
for Ankur. Ankur is not a programmer. Write reports, release notes and
`CHANGES.md` entries in plain English.

## Current work

The plan-engine work follows `PLAN_ENGINE_BRIEF.md` in the repo root, if that
file is present. It is private (kept out of git by `.git/info/exclude`) and
holds real household figures. Never commit it, push it, or copy its figures into
tests, fixtures or `CHANGES.md`.

## Rules

- **Never rewrite `components/AssetManagerApp.tsx` wholesale, and never shorten
  it by dropping features.** Make surgical edits. To move code into a new file,
  move it verbatim, then check with `git diff --stat` that lines removed and
  lines added roughly match. Name every deliberately removed feature in
  `CHANGES.md`.
- Write the failing test first, then the fix. `npm run check` (lint, typecheck,
  unit tests, build) must pass before every commit.
- Make one commit per task. Start each message with `fix:`, `feat:`, `test:` or
  `refactor:`.
- `npm run build` rewrites `next-env.d.ts`. Restore it with
  `git checkout -- next-env.d.ts` and do not commit that change.
- Use real dates in tests only when pinned to a fixed date and India time.
- **Releases:** push the branch and let Vercel build a preview. Give Ankur the
  preview link and the figures to check. Release to production once per phase,
  never once per commit, and only after Ankur has checked the preview.
- **Release routine** (see the top of `CHANGES.md`): bump the version in
  `package.json` and `lib/appVersion.ts` (10.32 → 10.33 → …), take a timestamped
  backup zip and a git tag, and add a plain-English entry to `CHANGES.md`.
- Never read, write or migrate live Supabase data from scripts, and never run
  destructive SQL. Put new saved settings in a new `records` row (for example
  `module_key: 'planSettings'`), which needs no schema change.
- No paid APIs or new paid services.
- If a file or fact is missing, stop and ask. Do not guess.
