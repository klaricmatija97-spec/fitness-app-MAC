@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  POKRETANJE BEZ TURBOPACK
echo ========================================
echo.

echo Zatvaram sve Node.js procese...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo Brišem .next cache...
if exist ".next" (
    rmdir /s /q .next 2>nul
)

echo Pokrećem aplikaciju BEZ Turbopack...
echo.
echo ════════════════════════════════════════
echo    NAKON "Ready" otvori: localhost:3000
echo ════════════════════════════════════════
echo.

call npm.cmd run dev

