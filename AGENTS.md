<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Grifo project rules

- Read `docs/plan-campana.md` before changing campaign behavior or scoring.
- Keep every operational API route authenticated. Public code/docs do not authorize public access to campaign records.
- Never add `.env*`, `.private`, `.data`, credentials, real contact records or payment proofs to Git.
- `npm test` uses isolated in-memory PGlite and must never access production.
- Score accreditation requires official evidence, admin permission, token scopes and duplicate/cap checks. Keep edits and audit writes atomic.
- Preserve Next.js 16.3, the package lock and existing migration history. Add new migrations for later schema changes.
- Run typecheck, lint, tests, OpenAPI validation and production build before publishing.
