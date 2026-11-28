#!/usr/bin/env bash
# Werkbank stoppen (Daten bleiben erhalten).  Aufruf:  bash stop.sh
cd "$(dirname "$0")"
DOCKER="docker"; docker info >/dev/null 2>&1 || DOCKER="sudo docker"
$DOCKER compose --profile internet --profile ki down && echo "Werkbank gestoppt. Daten bleiben im Docker-Volume erhalten."
