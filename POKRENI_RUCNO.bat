@echo off
chcp 65001 >nul
cls
cd /d "%~dp0"

echo.
echo ========================================
echo  RUČNO POKRETANJE APLIKACIJE
echo ========================================
echo.

echo Korak 1: Zatvaram sve procese...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 3 >nul
echo ✅ Gotovo
echo.

echo Korak 2: Provjeravam env.local...
if not exist "env.local" (
    echo ❌ env.local ne postoji - kreiram...
    (
        echo SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co
        echo SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcHVhdW5ldWJvZHRodnJtenFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ4MTk4MiwiZXhwIjoyMDc5MDU3OTgyfQ.zAlBJK9S07C5PGWNZGiQ0H4qbEPZ6SYw6yuU-kLvVcc
    ) > env.local
    echo ✅ Kreiran
) else (
    echo ✅ env.local postoji
)
echo.

echo Korak 3: Provjeravam Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js nije pronađen!
    echo.
    echo Instaliraj Node.js s: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js pronađen
node --version
echo.

echo Korak 4: Provjeravam dependencies...
if not exist "node_modules\next" (
    echo ⚠️  Next.js nije instaliran - instaliram...
    call npm.cmd install
    if %errorlevel% neq 0 (
        echo ❌ Instalacija neuspješna!
        pause
        exit /b 1
    )
    echo ✅ Instalirano
) else (
    echo ✅ Dependencies postoje
)
echo.

echo Korak 5: Oslobađam port 3000...
netstat -ano | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo Port je zauzet - oslobađam...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 3 >nul
)
echo ✅ Port oslobođen
echo.

echo Korak 6: Brišem cache...
if exist ".next" (
    rmdir /s /q .next 2>nul
)
echo ✅ Cache obrisan
echo.

echo ========================================
echo  POKREĆEM APLIKACIJU
echo ========================================
echo.
echo ⚠️  VAŽNO:
echo    1. SAČEKAJ 30-60 SEKUNDI
echo    2. Trebao bi vidjeti "Ready" ili "Local: http://localhost:3000"
echo    3. Nakon "Ready", otvori browser: http://localhost:3000
echo.
echo ========================================
echo.

REM Pokreni direktno preko node
set NODE_ENV=development
call npm.cmd run dev

pause

