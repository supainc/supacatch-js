# Ingest an event

Ingest accepts an error payload with a project bearer key and groups it onto an Issue the dashboard can show.

## Sub-features

- `ingest-unauthorized` rejects a missing or unknown bearer.
- `ingest-accepted` returns 202 and an event id for a valid key.
- `ingest-visible` shows the new error name on Issues for the project’s organization after the queue runs.

## How to get to it (user POV)

- An SDK or `curl`/`control-supacatch ingest submit` against `http://localhost:3001/v1/events`.
- Copy the ingest key from project create or project home rotation; or use the seed key if the session is in organization `demo`.

## Driving it with control-supacatch

Preconditions:

- `control-supacatch doctor` reports `ok: true`.
- A real ingest key for a project in the org you will inspect. Seed key `sck_demo_0123456789abcdef0123456789abcdef` only if `bun run seed` ran and the signed-in org is `demo`.
- Unique `name`/`message` for this run so the list proof is distinguishable (for example name `VerifyIngestError`).

- **Reject anonymous.** Doctor already POSTed without a bearer and required 401. Do not treat 404 as health.
- **Submit.** Send an event. Run `control-supacatch ingest submit --name VerifyIngestError --message "verification run" --key "<ingestKey>"`. Exit 0, HTTP 202, body includes `eventId`.
- **See it.** After a few seconds, open Issues signed in on that org. Run `control-supacatch browser goto --path /issues`. A link named `VerifyIngestError` appears (fingerprint may merge with an existing issue of the same name; then event count increases instead). Open it; Recent events includes a new timestamp.
- **Proof.** Save the ingest JSON stdout next to `artifacts/ingest-event/submit.json`, plus `control-supacatch browser screenshot --path artifacts/ingest-event/issues.png` showing the issue title or incremented count.

## Gotchas

- Ingest is async (queue consumer). 202 is not the dashboard yet.
- Wrong org: the event is stored on the key’s project even if the browser is looking at another organization.
- Invalid key and malformed body are both non-202; only 401 without a bearer is the doctor signal.
- Production ingest URL is not this recipe. Local proof is `:3001`.
