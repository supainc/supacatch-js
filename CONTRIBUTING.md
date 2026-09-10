# Contributing

1. Open an issue before substantial changes.
2. Install dependencies with `bun install`.
3. Run `bun run check` before requesting review.
4. Add tests for behavior changes.

Published packages live in `packages/`. Put shared capture behavior in `packages/core`. Put runtime and framework behavior in the package that owns that integration.

## Release

Bump every workspace package to the same version, including internal `@supainc/supacatch-*` dependency pins and `bun.lock`. Merge that change to `main`, then dispatch `.github/workflows/release.yml`.

Publish uses npm trusted publishing (GitHub Actions OIDC). There is no npm token: the job authenticates only if npm can exchange its OIDC token for a publish credential. npm ignores a failed exchange and falls back to whatever credentials it finds, so a missing or mismatched trusted publisher surfaces as `ENEEDAUTH`, or as `E404` while `actions/setup-node` writes a placeholder `NODE_AUTH_TOKEN` (which is why `registry-url` is omitted).

Trusted publishers are per package name, and npm cannot configure one for a name that does not exist yet. A brand-new package needs one manual `npm publish` from a maintainer account first; every later version then publishes from CI.

Each published package needs its own GitHub Actions trusted publisher on npmjs.com (Package settings → Trusted publishing). npm matches every field against the job's OIDC claims, so all of them are exact:

- Organization or user: `supainc`
- Repository: `supacatch-js` — the bare name, no owner prefix and no URL
- Workflow filename: `release.yml`
- Environment name: `npm` — the publish job declares `environment: npm`, and a blank field will not match it
- Allowed actions: include `npm publish` (publishers created after 2026-09-03 default to `npm stage publish` only)

npm does not validate that configuration until publish, and any mismatch answers the token exchange with `404 OIDC token exchange error - package not found`. That message means no publisher matched the job, not that the package is missing. The `Check trusted publishers` step reports that per package before anything is published, so one dispatch shows every entry that needs fixing.

By contributing, you agree that your contribution is licensed under the MIT License.
