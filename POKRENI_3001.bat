@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ========================================
echo  POKRETANJE NA PORTU 3001
echo ========================================
echo.

if not exist "node_modules" (
    echo Instaliram dependencies...
    call npm.cmd install
    echo.
)

echo Pokrećem aplikaciju na portu 3001...
echo.
echo ════════════════════════════════════════
echo    NAKON "Ready" otvori: localhost:3001
echo ════════════════════════════════════════
echo.

call npm.cmd run dev -- -p 3001

