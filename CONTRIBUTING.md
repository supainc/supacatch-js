# Contributing

1. Open an issue before substantial changes.
2. Install dependencies with `bun install`.
3. Run `bun run check` before requesting review.
4. Add tests for behavior changes.

Published packages live in `packages/`. Put shared capture behavior in `packages/core`. Put runtime and framework behavior in the package that owns that integration.

## Release

Bump every workspace package to the same version, including internal `@supainc/supacatch-*` dependency pins and `bun.lock`. Merge that change to `main`, then dispatch `.github/workflows/release.yml`.

Publish uses npm trusted publishing (GitHub Actions OIDC), not a long-lived npm token. `actions/setup-node`'s `registry-url` input is omitted on purpose: it writes `always-auth` and a dummy `NODE_AUTH_TOKEN` that makes `npm publish` skip OIDC and fail with `E404`.

Each published package needs a GitHub Actions trusted publisher on npmjs.com (Package settings → Trusted publishing) with:

- Organization or user: `supainc`
- Repository: `supacatch-js`
- Workflow filename: `release.yml`
- Environment name: `npm`
- Allowed actions: include `npm publish` (new publishers default to `npm stage publish` only)

npm does not validate that configuration until publish. After changing it, dispatch Release again.

By contributing, you agree that your contribution is licensed under the MIT License.
