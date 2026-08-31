#!/usr/bin/env bash
# Cloud Agent install: provision Bun and install project dependencies.
# Idempotent: safe to run repeatedly against cached state.
set -euo pipefail

BUN_VERSION="1.3.14"

if ! command -v bun >/dev/null 2>&1 || [ "$(bun --version 2>/dev/null || true)" != "$BUN_VERSION" ]; then
  curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}"
fi

export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

# Expose bun on the system PATH so every future shell finds it.
sudo ln -sf "$BUN_INSTALL/bin/bun" /usr/local/bin/bun
sudo ln -sf "$BUN_INSTALL/bin/bunx" /usr/local/bin/bunx

# Install dependencies. Skip lifecycle scripts here because the package's
# `prepare` hook runs `lefthook install`, which fails when a custom git
# core.hooksPath is set (as it is inside Cloud Agents). Run the essential
# parts of `prepare` explicitly instead.
bun install --frozen-lockfile --ignore-scripts

# effect-tsgo patch is required for tsc typecheck/build to work.
bunx effect-tsgo patch

# Git hooks are convenient but optional; never fail setup on them.
bunx lefthook install || echo "lefthook install skipped (custom hooks path)"
