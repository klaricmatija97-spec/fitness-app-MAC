@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Pokušavam pokrenuti na portu 3001...
echo.

if not exist "node_modules" (
    echo Instaliram dependencies...
    call npm.cmd install
    echo.
)

echo Pokrećem na portu 3001...
echo Nakon "Ready", otvori browser: http://localhost:3001
echo.
pause

call npm.cmd run dev -- -p 3001

