---
name: verify-supacatch
description: Drive the SupaCatch dashboard (web UI on :3000) and ingest worker (:3001) the way a user would. Use when proving UI or ingest behavior, reproducing dashboard bugs, or checking local alchemy after a change.
---

# Verify SupaCatch

Primary surface is the **dashboard** at `http://localhost:3000` (TanStack Start, Auth0). Secondary surface is the **ingest** HTTP API at `http://localhost:3001` (`POST /v1/events`). There is no CLI product. Do not drive `https://ingest-dev-<user>.catch.supa.dev`: that hostname is the GitHub webhook tunnel to the same ingest process, not a second app.

This skill is the recipe. Feature files under `features/` are the maintained map of user-facing behavior.

## Launch

Repo root: three directories above this skill (`supacatch/`).

Prerequisites already documented in the root README: `.env` from `.env.example`, `bun install`, Docker Postgres, schema:

```sh
docker compose up -d
bun run push
bun run master
```

Optional demo Issues (fixed ingest key `sck_demo_0123456789abcdef0123456789abcdef`, organization slug `demo`, project name `demo`):

```sh
bun run seed
```

Seed does **not** create a user or membership. Demo Issues appear in the dashboard only if the signed-in session's active organization is `demo`.

Start the app with the repo's own command:

```sh
.cursor/skills/verify-supacatch/bin/control-supacatch launch
```

That runs `bun run dev` (Alchemy: dashboard :3000, ingest :3001, Cloudflare tunnel for GitHub webhooks). Ready when `doctor` reports both probes ok: dashboard GET answers, ingest `POST /v1/events` without a bearer returns **401**.

**Isolation.** Ports **3000**, **3001**, and Postgres **5432** are shared. Two alchemy stacks cannot run side by side. If either HTTP probe already answers, `launch` refuses and does not start a second process. Drive the existing instance with `doctor` + browser/ingest. Never kill a `bun`/`alchemy`/`vite` process by name. `cleanup` only signals the pid recorded in `.run/state.json` when `owned` is true.

If this checkout already has `bun run dev` in a terminal, do not launch. Run `doctor` and proceed.

Teardown of an owned launch:

```sh
.cursor/skills/verify-supacatch/bin/control-supacatch cleanup
```

## Doctor

Run first whenever anything looks off:

```sh
.cursor/skills/verify-supacatch/bin/control-supacatch doctor
```

Require `ok: true`, `dashboardUrl` `http://localhost:3000`, `ingestUrl` `http://localhost:3001`, ingest status **401** without a bearer. Dashboard GET `/` commonly **307**s to `/signin`; `/signin` must be **200**. If `ownedByThisRun` is false, you are attached to someone else's (or the user's) process: still drive it, but **do not cleanup-kill it**.

Auth check: `browser goto --path /signin` must show heading `Sign In` and button `Continue with Auth0`. After a completed Auth0 login in the verification browser profile, `browser goto --path /issues` must show heading `Issues` rather than bouncing to `/signin`.

## Drive

Harness is `control-supacatch` (Bun + Playwright Chromium, persistent profile `.run/browser-profile`). Install once from the skill directory:

```sh
cd .cursor/skills/verify-supacatch && bun install && bunx playwright install chromium
```

Always `doctor` before the first action. Prefer roles and accessible names from this app, not CSS or coordinates. Viewport for recipes is 1280×800 (desktop sidebar visible; below `md` the nav is behind `Open navigation`).

| Action                                 | Command                                                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Open a route                           | `control-supacatch browser goto --path /signin`                                                |
| Click                                  | `control-supacatch browser click --role button --name "Continue with Auth0"`                   |
| Fill                                   | `control-supacatch browser fill --role textbox --name "Project name" --value "verify-project"` |
| Keys                                   | `control-supacatch browser press --key Escape`                                                 |
| Screenshot                             | `control-supacatch browser screenshot --path artifacts/<feature>/after.png`                    |
| ARIA snapshot                          | `control-supacatch browser snapshot --aria --path artifacts/<feature>/after.aria.txt`          |
| Ingest an event                        | `control-supacatch ingest submit --name TypeError --message "verify ingest" [--key <key>]`     |
| Drop the browser profile (not the app) | `control-supacatch browser close`                                                              |

Stable handles (this codebase):

- Primary nav `aria-label="Primary"`: links **Issues** (`/issues`), **Projects** (`/projects`), **Alerts** (`/alerts`), **Settings** (`/settings`).
- Sign-in: heading **Sign In**, button **Continue with Auth0**.
- Issues: heading **Issues**, combobox **Project**, empty copy **No Issues yet**, pagination `aria-label="Issue list pagination"`, links **Previous** / **Next**.
- Issue detail: heading is the issue title; buttons **Investigate**, **Resolve**; heading **Recent events**.
- Projects: heading **All Projects**, button **Create Project**, dialog heading **Create Project**, textbox **Project name**, buttons **Cancel** / **Create project**, then heading **Project created**, **Ingest Key**, **Copy**, **Done**. Empty: **No Projects yet. Create one to get started.**
- Alerts: heading **Alerts**, button **Create Alert**, empty **No Alerts yet**.
- Settings hub: heading **Settings**; cards **Organization**, **Members**, **Slack**, **GitHub**, **Claude**.

Auth0 is the identity boundary. Do not insert rows into `session` / `user` to fake a login. Complete **Continue with Auth0** once in the verification Chromium profile (local `:3000` callback). Later runs reuse `.run/browser-profile`.

Each `browser` subcommand opens and closes Chromium on that profile. Cookies persist; the last URL is restored from `.run/browser-url.txt` so screenshot/snapshot after goto still hit the same page. `browser close` deletes the profile (signed-out). Do not call it mid-recipe.

Read `features/` and drive the listed entry points, not a single convenient shortcut.

## Evidence

Write proof under `.cursor/skills/verify-supacatch/artifacts/<feature-id>/`. That directory survives `cleanup`. Do not commit it (skill `.gitignore`).

Proof standards:

- Exercise the real path: dashboard clicks and `POST /v1/events` with a bearer ingest key. Do not call server functions or SQL writes as a substitute for the UI, except read-only SQL to confirm a side effect after ingest.
- Capture the action and the resulting state (screenshot + ARIA snapshot before and after a mutation). The final screen alone is not enough.
- Ingest: HTTP status **202** and an `eventId` in the body. Then a second view: Issues list or issue detail showing the new error name, or a row in `event` for that id. Processing is queued; wait and refresh rather than asserting the list in the same second.
- Mocks only at production boundaries already isolated (Auth0 login UI is live; Slack/GitHub OAuth apps are live). Do not stub ingest inside the worker to claim an event was recorded.
- Record the feature file id and the entry point used next to the artifacts.

## Cleanup

```sh
.cursor/skills/verify-supacatch/bin/control-supacatch cleanup
```

Stops only the pid in `.run/state.json` when this run owns it. Removes `.run/state.json`, `.run/dev.log`, and `.run/browser-profile`. **Never deletes `artifacts/`.** If `owned` was false, cleanup must not SIGTERM the user's `bun run dev`.

## Helpers

All invocations from repo root, binary at `.cursor/skills/verify-supacatch/bin/control-supacatch`.

Relative `--path` values for screenshot and snapshot resolve under this skill directory, so `artifacts/sign-in/page.png` is `.cursor/skills/verify-supacatch/artifacts/sign-in/page.png` even when cwd is the repo root. `browser click` waits for a URL change (and presses Enter if a mouse click does not navigate) so Auth0 and other redirects are stored in `.run/browser-url.txt` before Chromium closes.

First-time Playwright (skill-local, not the app `package.json`):

```sh
cd .cursor/skills/verify-supacatch && bun install && bunx playwright install chromium
```
