@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  POKRETANJE S DETALJNIM OUTPUT-OM
echo ========================================
echo.

echo Zatvaram sve procese...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo Brišem cache...
if exist ".next" rmdir /s /q .next 2>nul

if not exist "node_modules" (
    echo Instaliram dependencies...
    call npm.cmd install
    echo.
)

echo ========================================
echo  POKREĆEM APLIKACIJU
echo ========================================
echo.
echo ⚠️  SADA PAZI - TREBAŠ VIDJETI:
echo    1. "Next.js 16.0.3" ili slično
echo    2. "Local: http://localhost:3000"
echo    3. "Ready" ili "Ready in X.Xs"
echo.
echo ⚠️  AKO VIDIŠ GREŠKU, KOPIRAJ CIJELU PORUKU!
echo.
echo ════════════════════════════════════════
echo.

call npm.cmd run dev -- --turbo=false

echo.
echo ════════════════════════════════════════
echo.
echo Ako aplikacija radi, otvori browser:
echo http://localhost:3000
echo.
pause

