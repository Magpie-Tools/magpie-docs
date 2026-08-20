#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
DOCS_DIR="$ROOT"
BUILD_DIR="$DOCS_DIR/build"
DISTRIBUTION_INPUT="${MAGPIE_DISTRIBUTION_REPO:-$ROOT/../magpie}"

cd "$DOCS_DIR"
npm run build

if ! distribution_repo="$(git -C "$DISTRIBUTION_INPUT" rev-parse --show-toplevel 2>/dev/null)"; then
  echo "Distribution repository not found: $DISTRIBUTION_INPUT" >&2
  echo "Clone Magpie-Tools/magpie beside this repository or set MAGPIE_DISTRIBUTION_REPO." >&2
  exit 1
fi

publisher="$distribution_repo/scripts/publish-pages-artifact.sh"
if [ ! -f "$publisher" ]; then
  echo "Pages publisher not found: $publisher" >&2
  exit 1
fi

bash "$publisher" "$BUILD_DIR" docs "Deploy documentation"
