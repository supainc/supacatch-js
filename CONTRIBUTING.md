# Contributing

1. Open an issue before substantial changes.
2. Install dependencies with `bun install`.
3. Run `bun run check` before requesting review.
4. Add tests for behavior changes.

Published packages live in `packages/`. Put shared capture behavior in `packages/core`. Put runtime and framework behavior in the package that owns that integration.

## Release

Bump every workspace package to the same version, including internal `@supainc/supacatch-*` dependency pins and `bun.lock`. Merge that to `main`, then dispatch `.github/workflows/release.yml`.

The workflow holds no npm token. It authenticates through npm trusted publishing and runs `npm stage publish`, so the packages stay off the public registry until a maintainer approves them with 2FA. Each package name needs its own publisher on npmjs.com (package Settings → Trusted publishing → GitHub Actions) matching the job's OIDC claims exactly: organization `supainc`, repository `supacatch-js`, workflow filename `release.yml`, environment name `npm`. Leave **Allow npm publish** unchecked so the publisher can only stage. npm cannot configure a publisher for a name that does not exist yet, so a brand-new package needs one manual publish first.

After the workflow succeeds, approve every staged package in the same release (they pin each other) from npmjs.com → **Staged Packages**, or with `npm stage list` and `npm stage approve <stage-id>`. Approval always prompts for 2FA. To replace a staged version, `npm stage reject <stage-id>` first, then dispatch Release again.

npm never reports a failed token exchange directly: it reports `E404` on the stage, or `ENEEDAUTH` when no `.npmrc` credential is present. Re-run the command with `--loglevel verbose` to see the reason, where `OIDC token exchange error - package not found` means no publisher matched the job rather than a missing package.

By contributing, you agree that your contribution is licensed under the MIT License.
