# Sign in

Sign in is the unauthenticated entry: the dashboard shows SupaCatch branding and starts Auth0 when the user continues.

## Sub-features

- `signin-page` shows the Sign In heading and Continue with Auth0 when there is no session.
- `signin-redirect` sends an unauthenticated visit to a protected route toward `/signin`.
- `signin-auth0` starts the Auth0 authorization redirect from Continue with Auth0.
- `signin-error` shows callback error copy when `?error=` is present.

## How to get to it (user POV)

- Open `/signin` directly.
- Open `/issues` (or `/`, which redirects to `/issues`) while signed out.
- Return from Auth0 with an error query on `/signin`.

## Driving it with control-supacatch

Preconditions:

- `control-supacatch doctor` reports `ok: true`.
- Verification browser profile is signed out (`browser close` if a prior login is in the way).

- **Open sign-in.** Go to `/signin`. Run `control-supacatch browser goto --path /signin`. The heading is `Sign In`, the subtitle includes `supacatch`, and a button named `Continue with Auth0` is enabled.
- **Protected redirect.** Go to `/issues` signed out. Run `control-supacatch browser goto --path /issues`. The URL contains `/signin` and the same Sign In heading appears.
- **Start Auth0.** Choose Continue with Auth0. Run `control-supacatch browser click --role button --name "Continue with Auth0"`. The button may read `Redirecting...`, then the page leaves localhost for the Auth0 domain (or shows a Sign In error Alert if Auth0 env is wrong).
- **Error query.** Open `/signin?error=Sign%20in%20failed` without completing OAuth. Run `control-supacatch browser goto --path "/signin?error=Sign%20in%20failed"`. An Alert description contains `Sign in failed`.
- **Proof.** Capture the idle sign-in page before clicking Auth0. Run `control-supacatch browser goto --path /signin`, `control-supacatch browser snapshot --aria --path artifacts/sign-in/page.aria.txt`, and `control-supacatch browser screenshot --path artifacts/sign-in/page.png`. Artifacts show `Sign In` and `Continue with Auth0`.

## Gotchas

- Completing Auth0 is required for other features, not for proving this page. Stop after the redirect starts unless you intend to persist a session in `.run/browser-profile`.
- Sign in on `http://localhost:3000`. The ingest webhook tunnel is not the dashboard.
- `/` redirects to `/issues` only after a session exists; signed out it still ends at `/signin`.
