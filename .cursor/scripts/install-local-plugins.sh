#!/usr/bin/env bash
# Install the plugins vendored in .cursor/plugins/local into ~/.cursor/plugins/local,
# the only directory Cursor scans for local plugins. Idempotent: safe to re-run.
set -euo pipefail
shopt -s nullglob

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source_dir="$repo_root/.cursor/plugins/local"
target_dir="${HOME}/.cursor/plugins/local"

plugins=("$source_dir"/*/)
if [ ${#plugins[@]} -eq 0 ]; then
  echo "no plugins found in $source_dir"
  exit 0
fi

mkdir -p "$target_dir"

for plugin in "${plugins[@]}"; do
  name="$(basename "$plugin")"

  if [ ! -f "$plugin/.cursor-plugin/plugin.json" ] && [ ! -f "$plugin/plugin.json" ]; then
    echo "skipped $name (no .cursor-plugin/plugin.json or plugin.json manifest)"
    continue
  fi

  # Cursor skips a symlink that resolves outside ~/.cursor/plugins/local, so copy
  # the tree instead of linking it back to the repo.
  rm -rf "$target_dir/$name"
  cp -R "${plugin%/}" "$target_dir/$name"
  echo "installed $name -> $target_dir/$name"
done

echo
echo "Restart Cursor (or run Developer: Reload Window), then open Customize to confirm."
echo "Teams/Enterprise also need Allow Local Plugin Imports enabled in the dashboard."
