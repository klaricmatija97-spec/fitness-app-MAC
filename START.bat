@echo off
chcp 65001 >nul
title CORPEX - Pokretanje
color 0A
cls

cd /d "%~dp0"

echo.
echo ========================================
echo   CORPEX - AUTOMATSKO POKRETANJE
echo ========================================
echo.

REM Zatvori sve procese
echo [1/6] Zatvaram sve procese...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul
echo ✅ Gotovo
echo.

REM Provjeri env.local
echo [2/6] Provjeravam env.local...
if not exist "env.local" (
    echo ❌ env.local ne postoji - kreiram...
    echo SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co> env.local
    echo SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcHVhdW5ldWJvZHRodnJtenFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ4MTk4MiwiZXhwIjoyMDc5MDU3OTgyfQ.zAlBJK9S07C5PGWNZGiQ0H4qbEPZ6SYw6yuU-kLvVcc>> env.local
    echo ✅ Kreiran
) else (
    echo ✅ Postoji
)
echo.

REM Instaliraj dependencies ako treba
echo [3/6] Provjeravam dependencies...
if not exist "node_modules" (
    echo ⚠️  Instaliram - sačekaj 1-2 minute...
    call npm.cmd install
    echo ✅ Gotovo
) else (
    echo ✅ Postoje
)
echo.

REM Očisti cache
echo [4/6] Čistim cache...
if exist ".next" rmdir /s /q .next 2>nul
echo ✅ Gotovo
echo.

REM Oslobodi port
echo [5/6] Oslobađam port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 >nul
echo ✅ Gotovo
echo.

echo [6/6] Pokrećem aplikaciju...
echo.
echo ========================================
echo   POKRETANJE...
echo ========================================
echo.
echo ⚠️  SAČEKAJ 30 SEKUNDI!
echo.
echo Trebao bi vidjeti:
echo   ▲ Next.js 16.0.3
echo   - Local: http://localhost:3000
echo   - Ready in X.Xs
echo.
echo Nakon "Ready", automatski ću otvoriti browser.
echo.
echo ════════════════════════════════════════
echo.

REM Otvori browser nakon 30 sekundi
start /B cmd /c "timeout /t 30 /nobreak >nul && start http://localhost:3000"

REM Pokreni aplikaciju
call npm.cmd run dev

