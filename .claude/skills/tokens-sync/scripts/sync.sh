#!/usr/bin/env bash
#
# tokens-sync helper — build, diff, and commit the design-token pipeline.
# Run from anywhere inside the target git repo.
#
#   sync.sh build    # just run style-dictionary
#   sync.sh diff     # build + show diff of token files + flag removals
#   sync.sh commit   # add + commit + push, print commit URL
#
set -euo pipefail

CMD="${1:-diff}"
FILES=(tokens.json src/styles/tokens.css tailwind.preset.cjs)

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

build() {
  echo "▶ npx style-dictionary build"
  npx style-dictionary build
}

show_diff() {
  echo
  echo "▶ diff — ${FILES[*]}"
  git --no-pager diff -- "${FILES[@]}" || true

  # Compare CSS custom-property NAMES (not raw +/- lines) so value changes aren't
  # mistaken for removals and the "---" diff header isn't miscounted.
  local css=src/styles/tokens.css names_old names_new added removed
  names_old="$(git show "HEAD:$css" 2>/dev/null | grep -oE '^[[:space:]]*--[a-z0-9-]+' | sed 's/^[[:space:]]*//' | sort -u)"
  names_new="$(grep -oE '^[[:space:]]*--[a-z0-9-]+' "$css" 2>/dev/null | sed 's/^[[:space:]]*//' | sort -u)"
  added="$(comm -13 <(printf '%s\n' "$names_old") <(printf '%s\n' "$names_new") | grep -c . || true)"
  removed="$(comm -23 <(printf '%s\n' "$names_old") <(printf '%s\n' "$names_new") | grep -c . || true)"
  echo
  echo "▶ summary: CSS variables — added ${added}, removed ${removed}"
  if [ "${removed}" -gt 0 ]; then
    echo "  ⚠ ${removed} CSS variable(s) would be REMOVED:"
    comm -23 <(printf '%s\n' "$names_old") <(printf '%s\n' "$names_new") | sed 's/^/    /'
    echo "  → confirm before committing (Safety gate)."
  fi
}

commit() {
  git add "${FILES[@]}"
  if git diff --cached --quiet; then
    echo "Nothing to commit — tokens already in sync."
    exit 0
  fi
  git commit -m "chore(tokens): sync from Figma"
  git push

  local sha remote url
  sha="$(git rev-parse HEAD)"
  remote="$(git remote get-url origin 2>/dev/null || true)"
  url="$(printf '%s' "$remote" | sed -E 's#git@github.com:#https://github.com/#; s#\.git$##')"
  echo "✔ committed ${sha:0:7}"
  [ -n "$url" ] && echo "  ${url}/commit/${sha}"
}

case "$CMD" in
  build)  build ;;
  diff)   build; show_diff ;;
  commit) commit ;;
  *) echo "usage: sync.sh [build|diff|commit]" >&2; exit 1 ;;
esac
