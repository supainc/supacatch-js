# Contributing

1. Open an issue before substantial changes.
2. Install dependencies with `bun install`.
3. Run `bun run check` before requesting review.
4. Add tests for behavior changes.

Published packages live in `packages/`. Put transport-independent configuration, events, errors, and capture protocol behavior in `packages/core`. Put the Effect service and runtime adapter contract in `packages/effect`. Put runtime and framework behavior in the package that owns that integration.

Before the first `@supainc/supacatch-effect` release, an npm owner must publish the package once with account 2FA and configure trusted publishing for `.github/workflows/release.yml`. OIDC cannot create a new npm package name.

By contributing, you agree that your contribution is licensed under the MIT License.
