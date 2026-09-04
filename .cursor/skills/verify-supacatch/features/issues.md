# Issues

Issues lists error groups for the active organization, filters them by project, pages through them, and opens a detail view where the user can resolve an issue.

## Sub-features

- `issues-empty` shows the empty state when the organization has no issues.
- `issues-list` lists issue titles with status, event counts, and last seen.
- `issues-filter` limits the list with the Project combobox.
- `issues-page` moves between pages with Previous and Next.
- `issues-open` opens an issue from its title link.
- `issues-resolve` marks an unresolved issue resolved from the detail header.

## How to get to it (user POV)

- Choose **Issues** in the primary sidebar.
- Land on `/` while signed in (redirects to `/issues`).
- Open `/issues?projectId=<id>` or `/issues?page=2`.
- Choose an issue title, then **Resolve** on the detail page.

## Driving it with control-supacatch

Preconditions:

- `control-supacatch doctor` reports `ok: true`.
- Auth0 login has completed in `.run/browser-profile` and `/onboarding` is not shown.
- For list rows: the active organization has at least one issue (ingest or `bun run seed` plus membership in `demo`). For empty: an organization with no events.

- **Sidebar entry.** Choose Issues. Run `control-supacatch browser goto --path /issues` (or `click --role link --name "Issues"` from another signed-in page). The heading is `Issues`.
- **Empty state.** With no issues. The copy `No Issues yet` appears, plus `Issues will appear here when a Project receives an Event.`
- **Open issue.** Choose a title link (seed titles include `TypeError`, `RangeError`, `PaymentError`). Run `control-supacatch browser click --role link --name "TypeError"`. The detail heading matches that title and `Recent events` is present.
- **Filter.** On `/issues` with multiple projects, open combobox `Project` and choose one project name. The subtitle becomes `Issues in <name>.` and rows only show that project.
- **Paginate.** When the footer shows page 1 of N>1, choose `Next`. Run `control-supacatch browser click --role link --name "Next"`. The pagination status advances; `Previous` becomes a link.
- **Resolve.** On an unresolved detail, choose `Resolve`. Run `control-supacatch browser click --role button --name "Resolve"`. The badge reads `Resolved` and the Resolve button is gone.
- **Proof.** Capture the list with at least one title visible. Run `control-supacatch browser snapshot --aria --path artifacts/issues/list.aria.txt` and `control-supacatch browser screenshot --path artifacts/issues/list.png`.

## Gotchas

- Seed Issues live on organization `demo`. A personal org will show empty until you ingest with that org's project key.
- `Investigate` is a different control. It stays disabled without an Organization Anthropic key and a GitHub repo on the project; do not treat a disabled Investigate as a list failure.
- Resolve is destructive to fixture state. Prefer a verification-only ingested issue, not a shared demo issue the user is looking at.
- List updates after ingest are queued. Refresh `/issues` until the new title appears; do not assert in the same second as `ingest submit`.
