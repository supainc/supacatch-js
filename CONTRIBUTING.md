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

Each published package needs its own GitHub Actions trusted publisher on npmjs.com (Package settings → Trusted publishing) with:

- Organization or user: `supainc`
- Repository: `supacatch-js`
- Workflow filename: `release.yml`
- Environment name: `npm`
- Allowed actions: include `npm publish` (new publishers default to `npm stage publish` only)

npm does not validate that configuration until publish. After changing it, dispatch Release again.

By contributing, you agree that your contribution is licensed under the MIT License.
