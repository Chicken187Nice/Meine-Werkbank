#!/usr/bin/env bash
# Lokale KI einrichten: startet Ollama und lädt Sprachmodelle (mehrere Gigabyte, nur mit deinem Einverständnis).
# Aufruf:  bash ki-einrichten.sh                      lädt qwen3.5:4b
#          bash ki-einrichten.sh qwen3.5:2b ...       lädt die genannten Modelle
set -euo pipefail
cd "$(dirname "$0")"
DOCKER="docker"; docker info >/dev/null 2>&1 || DOCKER="sudo docker"
MODELLE=("$@"); [ ${#MODELLE[@]} -gt 0 ] || MODELLE=("qwen3.5:4b")
echo "Geladen werden das Docker-Image ollama/ollama (ca. 3,5 GB) und: ${MODELLE[*]} (je 2–4 GB)."
echo "Modelle haben eigene Lizenzen, siehe https://ollama.com/library"
if [ -t 0 ]; then read -r -p "Fortfahren? [j/N] " a; [[ "$a" == [jJ]* ]] || exit 0; fi
touch .env
setze() { grep -q "^$1=" .env && sed -i "s/^$1=.*/$1=$2/" .env || echo "$1=$2" >> .env; }
setze WB_KI 1
# Die KI bekommt höchstens 75 % der Prozessorkerne dieses Rechners
CPUS=$(LC_ALL=C awk -v n="$(nproc)" 'BEGIN { printf "%g", n * 0.75 }')
setze WB_KI_CPUS "$CPUS"; export WB_KI_CPUS="$CPUS"
echo "Die KI darf höchstens $CPUS von $(nproc) Prozessorkernen nutzen (75 %)."
$DOCKER compose --profile ki up -d ollama
for i in $(seq 1 60); do $DOCKER exec werkbank-ollama ollama list >/dev/null 2>&1 && break; sleep 1; done
for m in "${MODELLE[@]}"; do $DOCKER exec werkbank-ollama ollama pull "$m"; done
$DOCKER exec werkbank-ollama ollama list
echo "Fertig. Gib die Kachel „KI-Assistent“ in der Verwaltung den Nutzern frei, die sie benutzen sollen."
