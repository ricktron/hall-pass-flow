# AGENTS.md

This repo powers a Hall Pass Tracker used in a school setting.

Audience: coding agents (LLMs) working in Cursor or similar tools.
Goal: ship correct, minimal, auditable changes without creating schema drift or analytics fragmentation.


## Prime directive

1) Do not guess.
- If you are unsure, inspect the repo and cite exact file paths and DB objects to justify your decisions.

2) Prefer the existing repo patterns.
- Do not introduce new frameworks, new app architecture patterns, or new dependencies unless explicitly requested.

3) Preserve data and auditability.
- Never overwrite raw user inputs when normalizing.
- Any human correction must be logged (who, when, what changed).

4) Correctness first, performance second.
- Analytics are only valuable if the underlying data is normalized and stable.


## Stop conditions

Stop and ask for clarification (or produce a scoped proposal) before you:
- Drop or rename DB objects (tables, views, columns) in a way that could break existing clients
- Weaken Supabase RLS or use the service role in the browser as a shortcut
- Reformat large parts of the repo
- Introduce a new lint/format/test tool
- Make schema changes without a forward plan and rollback plan


## Repo facts (verified)

### Stack
- Bundler: Vite (see `vite.config.ts`)
- UI: React 18.x + React Router 6.x (see `package.json`)
- Language: TypeScript (see `tsconfig*.json`)
- Node version: not pinned (no `.nvmrc` or `.node-version` present)

### Package manager
- README recommends `npm`, and `package-lock.json` exists.
- `bun.lockb` also exists.
Rule: default to npm unless the owner explicitly chooses Bun. Do not modify lockfiles casually.

### Tooling
- ESLint configured via flat config `eslint.config.js`
- No Prettier (or equivalent formatter) configured
- No test runner configured
- No GitHub Actions CI workflows found

### Supabase
- Migrations live in `supabase/migrations/*.sql`
- Supabase config: `supabase/config.toml` (contains project id)
- Edge Function: `supabase/functions/auto-close-passes/index.ts` (Deno)
  - Auto-closes passes after 45 minutes (verify constant in file if editing)

### Key entrypoints
- App entry: `src/main.tsx`
- Router: `src/App.tsx`
  - `/` -> `src/pages/Index.tsx`
  - `/sign-in` -> `src/pages/StudentSignIn.tsx`
  - `/data-processor` -> `src/pages/DataProcessor.tsx`
- Student kiosk: `src/components/StudentView.tsx`, `src/components/MultipleStudentsView.tsx`, `src/components/StudentSignOutForm.tsx`
- Teacher portal: `src/components/TeacherView.tsx`, analytics in `src/components/AnalyticsView.tsx`
  - Teacher PIN gating: `src/components/PinEntryDialog.tsx`
- Supabase client: `src/integrations/supabase/client.ts` (generated, do not edit)
- Supabase types: `src/integrations/supabase/types.ts` (generated, regenerate via CLI)
- Data access layer: `src/lib/supabaseDataManager.ts` (preferred place for pass queries and writes)
  - Note: `src/components/TeacherView.tsx` also calls Supabase RPC and writes directly in places. Avoid expanding direct usage. Prefer consolidating into `supabaseDataManager.ts` when touching related code.


## Canonical commands (use repo scripts)

Install:
- `npm install`

Dev:
- `npm run dev`
  - Use the port printed in terminal or configured in `vite.config.ts`

Build:
- `npm run build`
- `npm run build:dev` (development mode build)
- `npm run preview`

Lint:
- `npm run lint`

Typecheck (not wired as a script):
- `npx tsc --noEmit`

Supabase type regeneration (requires Supabase CLI):
- `supabase gen types typescript --project-id <project_id_from_supabase/config.toml> > src/integrations/supabase/types.ts`


## Generated and do-not-edit files

Do not edit these directly:
- `src/integrations/supabase/client.ts`
  - This file is explicitly marked as auto-generated
- `src/integrations/supabase/types.ts`
  - Treat as generated output from Supabase typegen
- Lockfiles:
  - `package-lock.json` (npm)
  - `bun.lockb` (bun)
- `src/components/ui/*` (shadcn/ui generated components)
  - Modify sparingly and consistently, and avoid large churn


## Product scope

Core workflows:
- Student creates a pass (trip) with destination and time-out.
- Teacher dashboard shows active passes (out but not returned), including elapsed time and flags for overdue.
- Student returns or teacher closes a pass, setting time-in and status.
- Reporting and analytics: frequent flyers, by period, by destination, time windows.

Non-goals unless explicitly requested:
- Quotas, punitive enforcement rules, or features that increase student PII exposure.


## Database and schema guidance

### Migration reality
This project includes both legacy objects and newer canonical-looking objects in schema history.
Rule: do not deepen legacy dependencies.

Practical rule for agents:
- For app code changes, use the existing patterns already used by the app today.
- Do not introduce a third way to write passes.
- When adding or changing DB behavior, prefer additive, compatible changes and document cutover steps.

### DB change policy
All DB changes must:
- live in `supabase/migrations/*.sql`
- preserve existing data
- include forward plan and rollback plan in PR notes
- avoid breaking existing clients without compatibility measures

Preferred migration pattern:
1) Add new column or table (nullable, safe defaults)
2) Backfill (batch if needed)
3) Add constraints and indexes after backfill
4) Update app code
5) Deprecate old fields only after confirmation

Do not:
- Update grouped views directly (GROUP BY views are not updatable)
- Rename or drop DB objects without a compatibility plan

### RPC functions and edge functions
- If code calls Supabase RPC functions (example: teacher dashboard RPCs), do not change RPC signatures without updating all call sites and the SQL definition.
- If editing `auto-close-passes` edge function:
  - Keep behavior stable, especially time threshold and safety checks
  - Document deployment and verification steps in PR notes


## Normalization rules (high priority)

Data fragmentation is the enemy. Store both:
1) Raw inputs (what a student typed)
2) Canonical normalized values (what the system uses for joins and analytics)

Student name normalization requirements:
- Always preserve raw typed student name (never overwrite).
- Normalize to canonical roster identity when possible.
- If not resolvable, mark for review and surface in teacher portal.
- Maintain an aliases or synonyms mapping with an audit trail.

Destination normalization requirements:
- Destinations must not fragment due to spelling variants.
- Prefer a canonical destination dictionary with synonyms.
- Return both canonical destination and raw destination for debugging and audits.

If you add normalization, add unit tests for the normalization function and include a small set of tricky cases:
- casing changes
- extra whitespace
- punctuation
- repeated characters
- common nickname variants


## Security, privacy, and compliance

This is student data.
- Do not log student names, emails, or IDs to console in production.
- Do not add telemetry that captures raw names without explicit approval.
- Avoid real student names in fixtures, docs, or commit messages.

Supabase client keys:
- The anon key is public by design, but still treat it carefully.
- If moving keys to env vars, Vite uses `import.meta.env` and requires `VITE_` prefixes.
- Do not commit secrets or service role keys.


## Linting and formatting

Do not introduce new lint or format tools without explicit request.

ESLint:
- Config lives in `eslint.config.js`.
- Run lint via `npm run lint`.

Formatting:
- No formatter is configured.
Rules:
- Make minimal formatting changes in touched files only.
- Do not reformat the repo.
- Follow the local style of the file you are editing.


## Testing expectations

No test runner is currently configured.
Rules:
- For changes with logic risk (normalization, time math, status transitions), prefer adding tests if a harness is introduced by the owner.
- Otherwise, include a “Manual verification checklist” in the PR body with step-by-step UI checks.

Minimum manual checklist for pass lifecycle changes:
1) Create a pass in student view
2) Confirm it appears in teacher view as active
3) Mark returned and confirm it disappears from active list
4) Confirm elapsed time behavior looks correct
5) If applicable, confirm auto-close behavior still works (or document how to verify)


## Repo navigation quick tips

Where to look first:
- Routes: `src/App.tsx`
- Teacher UI: `src/components/TeacherView.tsx`
- Student UI: `src/components/StudentView.tsx`
- Data access: `src/lib/supabaseDataManager.ts`
- Supabase client: `src/integrations/supabase/client.ts` (generated)
- Supabase migrations: `supabase/migrations/`
- Edge function: `supabase/functions/auto-close-passes/`

Useful searches:
- `Hall_Passes`
- `hall_passes`
- `get_teacher_dashboard_data`
- `get_weekly_top_students`
- `auto-close-passes`
- `needsReview`
- `synonyms`
- `supabaseDataManager`


## Required agent workflow

When implementing a request:

1) Restate the request in one paragraph.
2) Locate relevant files and DB objects (list exact paths and object names).
3) Decide the least invasive change that matches existing repo patterns.
4) Implement the smallest correct change.
5) Run checks and report exact commands and results:
   - `npm run lint`
   - `npx tsc --noEmit`
   - any relevant build or manual checklist steps
6) Provide a PR-ready summary and verification steps.

Definition of done:
- Feature works end-to-end in the intended UI.
- Raw inputs preserved and normalized outputs consistent.
- No new data fragmentation.
- Lint passes and TypeScript typecheck passes.
- PR includes verification steps and migration notes if applicable.


## PR and commit conventions

Branch naming:
- `feat/<short-description>`
- `fix/<short-description>`
- `chore/<short-description>`
- `db/<short-description>`

Commit messages:
Use Conventional Commits unless the repo already uses a different convention.
Examples:
- `feat: add unmatched-name review page`
- `fix: prevent negative durations on return`
- `chore: document canonical data access paths`
- `db: add index for active-pass dashboard query`

PR description must include:
1) Summary
- What changed and why

2) Testing
- Commands run and results
- If no automated tests: manual verification checklist

3) DB migrations (if any)
- Forward plan
- Rollback plan
- Backfill notes

4) Risk notes
- What could break
- How to quickly verify in UI

Change discipline:
- Prefer small PRs.
- No drive-by reformatting or unrelated refactors.
- If a refactor is needed, split into two PRs:
  - PR1: mechanical or structural change with no behavior change
  - PR2: behavior changes with verification steps


## Owner decisions that would reduce ambiguity (optional, not for agents to decide)

- Pick and enforce one package manager (npm vs bun) and remove the other lockfile.
- Pin Node version (`.nvmrc` or `.node-version`) once you pick one.
- Decide whether to add:
  - `typecheck` script to `package.json`
  - a formatter (Prettier or Biome)
  - a minimal CI workflow (lint + typecheck + build)


## Hall Pass KB schema artifacts

Location: `docs/kb/hallpass/`

Purpose: These files are the canonical schema source of truth for AI-assisted SQL, migrations, analytics queries, and refactors.

Files:
- `hallpass_data_dictionary_v*.md`
- `hallpass_data_dictionary_v*.json`
- `hallpass_tables_catalog_v*.csv`
- `hallpass_columns_catalog_v*.csv`
- `hallpass_constraints_catalog_v*.csv`
- `hallpass_policies_catalog_v*.csv`
- `hallpass_views_catalog_v*.csv`
- `00_index.md`

When to update:
- Any time `public` schema changes in Supabase (new migration, column/table changes, view changes, trigger/function changes used by hall pass logic, RLS policy changes).
- Any time analytics views change (especially `hp_*` views).

How to update:
1. Generate a fresh schema snapshot (do not commit it):
   - `pg_dump --schema=public --schema-only "$DB_URL" > schema.sql`
2. Regenerate the KB artifacts (tables, columns, constraints, policies, views, and the dictionary) from the latest schema.
3. Save outputs into `docs/kb/hallpass/` using the next version number (`v2`, `v3`, etc).
4. Update `docs/kb/hallpass/00_index.md` to point to the latest versions.

Agent rules:
- When generating SQL or migrations, only reference tables and columns that exist in the latest `*_catalog_v*.csv` files.
- If a required field is missing or ambiguous, propose a schema migration instead of guessing.
- Never commit data exports (for example `data.sql`, `schema.sql`, `*.tgz`, `*.zip`) that include student data.
