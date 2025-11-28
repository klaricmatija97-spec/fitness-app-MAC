@echo off
chcp 65001 >nul
cd /d "%~dp0"

cls
echo.
echo ========================================
echo  KOMPLETNA PROVJERA I POKRETANJE
echo ========================================
echo.

REM [KORAK 1] Zatvori sve procese
echo [1/10] Zatvaram sve Node.js procese...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 3 >nul
echo ✅ Gotovo
echo.

REM [KORAK 2] Provjeri env.local
echo [2/10] Provjeravam env.local...
if not exist "env.local" (
    echo ❌ env.local NE POSTOJI - kreiram...
    (
        echo SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co
        echo SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcHVhdW5ldWJvZHRodnJtenFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ4MTk4MiwiZXhwIjoyMDc5MDU3OTgyfQ.zAlBJK9S07C5PGWNZGiQ0H4qbEPZ6SYw6yuU-kLvVcc
    ) > env.local
    echo ✅ Kreiran
) else (
    echo ✅ env.local postoji
    echo.
    echo Sadržaj env.local:
    echo ========================================
    type env.local
    echo ========================================
    echo.
    REM Provjeri URL
    findstr /C:"SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co" env.local >nul
    if %errorlevel% neq 0 (
        echo ⚠️  URL nije ispravan - popravljam...
        powershell -Command "(Get-Content 'env.local') -replace 'SUPABASE_URL=.*', 'SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co' | Set-Content 'env.local'"
        echo ✅ URL popravljen
    ) else (
        echo ✅ URL je ispravan
    )
)
echo.

REM [KORAK 3] Provjeri Node.js
echo [3/10] Provjeravam Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js NIJE PRONAĐEN!
    echo.
    echo Instaliraj Node.js s: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js pronađen
for /f "tokens=*" %%i in ('node --version 2^>nul') do set NODE_VERSION=%%i
echo    Verzija: %NODE_VERSION%
echo.

REM [KORAK 4] Provjeri npm
echo [4/10] Provjeravam npm...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm NIJE PRONAĐEN!
    pause
    exit /b 1
)
echo ✅ npm pronađen
for /f "tokens=*" %%i in ('npm --version 2^>nul') do set NPM_VERSION=%%i
echo    Verzija: %NPM_VERSION%
echo.

REM [KORAK 5] Provjeri package.json
echo [5/10] Provjeravam package.json...
if not exist "package.json" (
    echo ❌ package.json NE POSTOJI!
    pause
    exit /b 1
)
echo ✅ package.json postoji
echo.

REM [KORAK 6] Provjeri dependencies
echo [6/10] Provjeravam dependencies...
if not exist "node_modules" (
    echo ⚠️  node_modules ne postoji - instaliram...
    echo    Ovo može potrajati 1-2 minute...
    call npm.cmd install
    if %errorlevel% neq 0 (
        echo ❌ Instalacija NEUSPJEŠNA!
        pause
        exit /b 1
    )
    echo ✅ Dependencies instalirani
) else (
    echo ✅ node_modules postoji
    REM Provjeri da li postoje ključni paketi
    if not exist "node_modules\next" (
        echo ⚠️  Next.js nije instaliran - instaliram...
        call npm.cmd install
    )
    if not exist "node_modules\@supabase" (
        echo ⚠️  Supabase nije instaliran - instaliram...
        call npm.cmd install
    )
)
echo.

REM [KORAK 7] Očisti cache
echo [7/10] Čistim cache...
if exist ".next" (
    rmdir /s /q .next 2>nul
    if exist ".next" (
        echo ⚠️  Cache se nije mogao obrisati (možda je u upotrebi)
    ) else (
        echo ✅ Cache obrisan
    )
) else (
    echo ✅ Cache je čist
)
echo.

REM [KORAK 8] Provjeri port
echo [8/10] Provjeravam port 3000...
netstat -ano | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port 3000 je zauzet - oslobađam...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
        echo    Zatvaram proces: %%a
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 3 >nul
    echo ✅ Port oslobođen
) else (
    echo ✅ Port 3000 je slobodan
)
echo.

REM [KORAK 9] Provjeri kod za greške
echo [9/10] Provjeravam kod za greške...
if exist "app\page.tsx" (
    echo ✅ app/page.tsx postoji
) else (
    echo ❌ app/page.tsx NE POSTOJI!
)
if exist "app\layout.tsx" (
    echo ✅ app/layout.tsx postoji
) else (
    echo ❌ app/layout.tsx NE POSTOJI!
)
if exist "lib\supabase.ts" (
    echo ✅ lib/supabase.ts postoji
) else (
    echo ❌ lib/supabase.ts NE POSTOJI!
)
if exist "next.config.ts" (
    echo ✅ next.config.ts postoji
) else (
    echo ❌ next.config.ts NE POSTOJI!
)
echo.

REM [KORAK 10] Pokreni aplikaciju
echo [10/10] Pokrećem aplikaciju...
echo.
echo ========================================
echo  POKRETANJE APLIKACIJE
echo ========================================
echo.
echo ⚠️  SAČEKAJ 30 SEKUNDI dok se aplikacija učita!
echo.
echo Trebao bi vidjeti:
echo   ▲ Next.js 16.0.3
echo   - Local:        http://localhost:3000
echo   - Ready in X.Xs
echo.
echo Nakon "Ready", browser će se automatski otvoriti!
echo.
echo Ako se ne otvori, ručno otvori: http://localhost:3000
echo.
echo ════════════════════════════════════════
echo.

REM Otvori browser nakon 35 sekundi
start /B cmd /c "timeout /t 35 /nobreak >nul && start http://localhost:3000"

REM Pokreni aplikaciju
call npm.cmd run dev

echo.
echo ════════════════════════════════════════
echo.
echo Aplikacija je pokrenuta!
echo.
pause

