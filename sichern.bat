@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Sichere Werkbank-Daten nach werkbank-daten.tgz ...
docker run --rm -v werkbank_werkbank-daten:/d:ro -v "%cd%":/b alpine tar czf /b/werkbank-daten.tgz -C /d .
if errorlevel 1 (echo Fehler - laeuft Docker Desktop? & pause & exit /b 1)
echo.
echo Fertig: werkbank-daten.tgz liegt im Werkbank-Ordner.
echo Kopier den ganzen Ordner auf den Server, start.sh uebernimmt die Daten automatisch.
pause
