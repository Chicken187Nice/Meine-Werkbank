#!/usr/bin/env bash
# Sichert alle Werkbank-Daten (Nutzer, Einstellungen, Nachrichten) nach werkbank-daten.tgz.  Aufruf:  bash sichern.sh
cd "$(dirname "$0")"
DOCKER="docker"; docker info >/dev/null 2>&1 || DOCKER="sudo docker"
$DOCKER run --rm -v werkbank_werkbank-daten:/d:ro -v "$PWD":/b alpine sh -c "umask 077 && tar czf /b/werkbank-daten-$(date +%F).tgz -C /d . && chown $(id -u):$(id -g) /b/werkbank-daten-$(date +%F).tgz" && echo "Gesichert: werkbank-daten-$(date +%F).tgz"
