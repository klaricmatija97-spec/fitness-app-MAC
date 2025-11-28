@echo off
chcp 65001 >nul
echo.
echo ========================================
echo  FINALNI TEST - DIREKTNO IZ ENV.LOCAL
echo ========================================
echo.

cd /d "%~dp0"

echo Provjeravam env.local fajl...
echo.

if not exist "env.local" (
    echo ❌ env.local ne postoji!
    pause
    exit /b 1
)

echo ✅ env.local postoji!
echo.

if not exist "node_modules" (
    echo ⚠️  Instaliram dependencies...
    call npm.cmd install
    echo.
)

echo Pokrećem FINALNI test...
echo.
echo ========================================
echo.

node TEST_FINALNI.js

echo.
echo ========================================
echo.

if %ERRORLEVEL% EQU 0 (
    echo ✅ TEST USPJEŠAN!
) else (
    echo ❌ TEST NEUSPJEŠAN!
)

echo.
pause

