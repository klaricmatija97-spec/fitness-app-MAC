@echo off
chcp 65001 >nul
cd /d "%~dp0"

cls
echo.
echo ========================================
echo  KOMPLETNA POPRAVKA I POKRETANJE
echo ========================================
echo.

echo [KORAK 1/8] Zatvaram sve procese...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 3 >nul
echo ✅ Gotovo
echo.

echo [KORAK 2/8] Provjeravam env.local...
if not exist "env.local" (
    echo ❌ env.local NE POSTOJI!
    echo Kreiranje env.local...
    (
        echo SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co
        echo SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcHVhdW5ldWJvZHRodnJtenFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ4MTk4MiwiZXhwIjoyMDc5MDU3OTgyfQ.zAlBJK9S07C5PGWNZGiQ0H4qbEPZ6SYw6yuU-kLvVcc
    ) > env.local
    echo ✅ env.local kreiran
) else (
    echo ✅ env.local postoji
    echo.
    echo Provjeravam URL...
    findstr /C:"SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co" env.local >nul
    if %errorlevel% neq 0 (
        echo ⚠️  URL nije ispravan, popravljam...
        powershell -Command "(Get-Content 'env.local') -replace 'SUPABASE_URL=.*', 'SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co' | Set-Content 'env.local'"
        echo ✅ URL popravljen
    ) else (
        echo ✅ URL je ispravan
    )
)
echo.

echo [KORAK 3/8] Provjeravam Node.js...
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

echo [KORAK 4/8] Provjeravam npm...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm nije pronađen!
    pause
    exit /b 1
)
echo ✅ npm pronađen
npm --version
echo.

echo [KORAK 5/8] Provjeravam package.json...
if not exist "package.json" (
    echo ❌ package.json NE POSTOJI!
    pause
    exit /b 1
)
echo ✅ package.json postoji
echo.

echo [KORAK 6/8] Instaliram dependencies...
if not exist "node_modules" (
    echo Instaliram - ovo može potrajati 1-2 minute...
    call npm.cmd install
    if %errorlevel% neq 0 (
        echo ❌ Instalacija neuspješna!
        pause
        exit /b 1
    )
    echo ✅ Dependencies instalirani
) else (
    echo ✅ node_modules postoji
)
echo.

echo [KORAK 7/8] Čišćenje cache-a...
if exist ".next" (
    rmdir /s /q .next 2>nul
    echo ✅ Cache obrisan
)
if exist ".next" (
    echo ⚠️  Cache se nije mogao obrisati - možda je u upotrebi
) else (
    echo ✅ Cache je čist
)
echo.

echo [KORAK 8/8] Oslobađanje porta 3000...
netstat -ano | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo Port 3000 je zauzet - oslobađam...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
        echo Zatvaram proces: %%a
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 3 >nul
    echo ✅ Port oslobođen
) else (
    echo ✅ Port 3000 je slobodan
)
echo.

echo ========================================
echo  SVE SPREMNO - POKREĆEM APLIKACIJU
echo ========================================
echo.
echo ⚠️  SAČEKAJ 30 SEKUNDI dok se aplikacija učita!
echo.
echo Trebao bi vidjeti:
echo   ▲ Next.js 16.0.3
echo   - Local:        http://localhost:3000
echo   - Ready in X.Xs
echo.
echo Nakon "Ready", automatski ću otvoriti browser.
echo.
echo ════════════════════════════════════════
echo.

REM Otvori browser nakon 25 sekundi
start /B cmd /c "timeout /t 25 /nobreak >nul && start http://localhost:3000"

REM Pokreni aplikaciju
call npm.cmd run dev

echo.
echo ════════════════════════════════════════
echo.
pause

