@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Werkbank wird gebaut und gestartet ...
docker compose up -d --build
if errorlevel 1 (
  echo.
  echo Docker hat einen Fehler gemeldet. Laeuft Docker Desktop?
  pause
  exit /b 1
)
timeout /t 3 >nul
start "" http://localhost:8081
