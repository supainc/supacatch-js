# SupaCatch verification map

This directory is the maintained source for verifying user-facing behavior of SupaCatch. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Dashboard healthy at `http://localhost:3000` and ingest at `http://localhost:3001`.
- `control-supacatch doctor` reports `ok: true`.
- Drive localhost, not the ingest webhook tunnel (`ingest-*.catch.supa.dev`).
- Ports 3000/3001/5432 are exclusive. Never start a second `bun run dev`. Never kill an instance this run did not launch.
- Signed-out recipes start at `/signin`. Signed-in recipes require a completed Auth0 login in `.run/browser-profile` and must land on `/issues` (onboarding complete, active organization set). If `/onboarding` appears, finish that flow or pick an account that already has an organization; do not report Issues as verified.
- `bun run seed` is optional. It creates organization `demo` / project `demo` / ingest key `sck_demo_0123456789abcdef0123456789abcdef`. Seed does not attach the current user to `demo`.

## Driving conventions

- Start every recipe from the baseline unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names over CSS or DOM position. Desktop width (1280) so primary nav is visible.
- Treat every command as literal. Keep quoted names and flags unchanged.
- Run browser actions through `control-supacatch browser`.
- Run ingest through `control-supacatch ingest submit`.
- Restore mutated fixtures (delete a verification-only project, leave demo seed Issues unless the recipe says to resolve them). Do not remove proof artifacts.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a screenshot with heading copy visible (`Sign In`, `Issues`, `All Projects`, `Settings`, or the issue title).
- Ingest proof includes status, body, and a second view of the stored event.
- Record the feature ID and entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with control-supacatch` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Sign in](./sign-in.md) covers the Auth0 entry page and redirect start.
- [Issues](./issues.md) covers the issue list, project filter, pagination, detail, and resolve.
- [Projects](./projects.md) covers the project list, create modal, ingest key reveal, and project home.
- [Ingest an event](./ingest-event.md) covers `POST /v1/events` and the dashboard showing the new issue.
- [Alerts](./alerts.md) covers the alerts list and opening create.
- [Settings](./settings.md) covers the settings hub and opening Organization, Members, Slack, GitHub, and Claude.
