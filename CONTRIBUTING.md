# Contributing

1. Open an issue before substantial changes.
2. Install dependencies with `bun install`.
3. Run `bun run check` before requesting review.
4. Add tests for behavior changes.

Published packages live in `packages/`. Put shared capture behavior in `packages/core`. Put runtime and framework behavior in the package that owns that integration.

Release publishes from GitHub Actions with npm trusted publishing (OIDC). The `Release` workflow must stay named `release.yml`, and the job must keep `environment: npm`. A new package name cannot be created from that workflow: publish the first version locally with account 2FA (`npm publish ./packages/<name> --access public --tag alpha`), then run `npm trust github <package> --repository supainc/supacatch-js --file release.yml --environment npm --allow-publish`. Later versions use **Actions → Release**.

By contributing, you agree that your contribution is licensed under the MIT License.
