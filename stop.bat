@echo off
cd /d "%~dp0"
docker compose down
echo Werkbank gestoppt. Deine Daten bleiben im Volume erhalten.
pause
