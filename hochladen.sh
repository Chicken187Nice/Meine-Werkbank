#!/usr/bin/env bash
# Alle Änderungen committen und zu GitHub hochladen.  Aufruf:  bash hochladen.sh "Was ich geändert habe"
set -euo pipefail
cd "$(dirname "$0")"

# Ohne die Schutzprüfung wird nichts hochgeladen.
if [ ! -x .git/hooks/pre-commit ] || [ ! -x .git/hooks/pre-push ]; then
  echo "Abbruch: Die Schutzprüfung fehlt (.git/hooks/pre-commit und pre-push)." >&2; exit 1
fi

git add -A
if git diff --cached --quiet; then
  echo "Keine neuen Änderungen."
else
  git status --short
  git commit -q -m "${1:-Stand vom $(date '+%d.%m.%Y %H:%M')}"
fi
git push -u origin HEAD
echo "Hochgeladen."
