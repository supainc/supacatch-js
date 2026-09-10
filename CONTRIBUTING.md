# Contributing

1. Open an issue before substantial changes.
2. Install dependencies with `bun install`.
3. Run `bun run check` before requesting review.
4. Add tests for behavior changes.

Published packages live in `packages/`. Put shared capture behavior in `packages/core`. Put runtime and framework behavior in the package that owns that integration.

## Release

Bump every workspace package to the same version, including internal `@supainc/supacatch-*` dependency pins and `bun.lock`. Merge that to `main`, then dispatch `.github/workflows/release.yml`.

The workflow holds no npm token. It authenticates through npm trusted publishing, so every package name needs its own publisher on npmjs.com (package Settings → Trusted publishing → GitHub Actions) matching the job's OIDC claims exactly: organization `supainc`, repository `supacatch-js`, workflow filename `release.yml`, environment name `npm`, and `npm publish` among the allowed actions. npm cannot configure a publisher for a name that does not exist yet, so a brand-new package needs one manual publish first.

npm never reports a failed token exchange directly: it reports `E404` on the publish, or `ENEEDAUTH` when no `.npmrc` credential is present. Re-run the publish with `--loglevel verbose` to see the reason, where `OIDC token exchange error - package not found` means no publisher matched the job rather than a missing package.

By contributing, you agree that your contribution is licensed under the MIT License.
