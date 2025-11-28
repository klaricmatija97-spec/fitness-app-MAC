@echo off
chcp 65001 >nul
cls
cd /d "%~dp0"

echo.
echo ========================================
echo  KOMPLETNA PROVJERA I POKRETANJE
echo ========================================
echo.

REM [1] Zatvori sve procese
echo [1/12] Zatvaram sve Node.js procese...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 3 >nul
echo ✅ Gotovo
echo.

REM [2] Provjeri da smo u pravom folderu
echo [2/12] Provjeravam folder...
if not exist "package.json" (
    echo ❌ NISI U PRAVOM FOLDERU!
    echo.
    echo Trebao bi biti u: fitness-app folderu
    echo Trenutno si u: %CD%
    echo.
    pause
    exit /b 1
)
echo ✅ Folder je ispravan: %CD%
echo.

REM [3] Provjeri env.local
echo [3/12] Provjeravam env.local...
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

REM [4] Provjeri Node.js
echo [4/12] Provjeravam Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js NIJE PRONAĐEN!
    echo.
    echo Instaliraj Node.js s: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version 2^>nul') do set NODE_VER=%%i
echo ✅ Node.js: %NODE_VER%
echo.

REM [5] Provjeri npm
echo [5/12] Provjeravam npm...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm NIJE PRONAĐEN!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version 2^>nul') do set NPM_VER=%%i
echo ✅ npm: %NPM_VER%
echo.

REM [6] Provjeri ključne fajlove
echo [6/12] Provjeravam ključne fajlove...
if exist "app\page.tsx" (echo ✅ app/page.tsx) else (echo ❌ app/page.tsx NE POSTOJI!)
if exist "app\layout.tsx" (echo ✅ app/layout.tsx) else (echo ❌ app/layout.tsx NE POSTOJI!)
if exist "lib\supabase.ts" (echo ✅ lib/supabase.ts) else (echo ❌ lib/supabase.ts NE POSTOJI!)
if exist "next.config.ts" (echo ✅ next.config.ts) else (echo ❌ next.config.ts NE POSTOJI!)
echo.

REM [7] Instaliraj dependencies
echo [7/12] Provjeravam dependencies...
if not exist "node_modules" (
    echo ⚠️  Dependencies ne postoje - instaliram...
    echo    Ovo može potrajati 1-2 minute...
    call npm.cmd install
    if %errorlevel% neq 0 (
        echo ❌ Instalacija NEUSPJEŠNA!
        pause
        exit /b 1
    )
) else (
    echo ✅ Dependencies postoje
    REM Provjeri ključne pakete
    if not exist "node_modules\next" (
        echo ⚠️  Next.js nedostaje - instaliram...
        call npm.cmd install
    )
    if not exist "node_modules\@supabase" (
        echo ⚠️  Supabase nedostaje - instaliram...
        call npm.cmd install
    )
)
echo.

REM [8] Očisti cache
echo [8/12] Čistim cache...
if exist ".next" (
    rmdir /s /q .next 2>nul
    timeout /t 1 >nul
    if exist ".next" (
        echo ⚠️  Cache se nije mogao obrisati (možda je u upotrebi)
    ) else (
        echo ✅ Cache obrisan
    )
) else (
    echo ✅ Cache je čist
)
echo.

REM [9] Oslobodi port
echo [9/12] Oslobađam port 3000...
netstat -ano | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo Port je zauzet - oslobađam...
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

REM [10] Provjeri Supabase varijable
echo [10/12] Provjeravam Supabase varijable...
findstr /C:"SUPABASE_URL" env.local >nul
if %errorlevel% neq 0 (
    echo ❌ SUPABASE_URL nije u env.local!
) else (
    echo ✅ SUPABASE_URL postoji
)
findstr /C:"SUPABASE_SERVICE_ROLE_KEY" env.local >nul
if %errorlevel% neq 0 (
    echo ❌ SUPABASE_SERVICE_ROLE_KEY nije u env.local!
) else (
    echo ✅ SUPABASE_SERVICE_ROLE_KEY postoji
)
echo.

REM [11] Test Supabase konekcije (ako postoji test)
echo [11/12] Testiram Supabase konekciju...
if exist "TEST_FINALNI.js" (
    echo Pokrećem test...
    call node TEST_FINALNI.js
    if %errorlevel% equ 0 (
        echo ✅ Supabase konekcija RADI!
    ) else (
        echo ⚠️  Supabase test neuspješan - ali nastavljam
    )
) else (
    echo ℹ️  Test skripta ne postoji - preskačem
)
echo.

REM [12] Pokreni aplikaciju
echo [12/12] Pokrećem aplikaciju...
echo.
echo ========================================
echo  POKRETANJE...
echo ========================================
echo.
echo ⚠️  SAČEKAJ 30-60 SEKUNDI!
echo.
echo Trebao bi vidjeti:
echo   ▲ Next.js 16.0.3
echo   - Local:        http://localhost:3000
echo   - Ready in X.Xs
echo.
echo Nakon "Ready", otvori browser:
echo   http://localhost:3000
echo.
echo ========================================
echo.
pause

REM Otvori browser nakon 40 sekundi
start /B cmd /c "timeout /t 40 /nobreak >nul && start http://localhost:3000 && echo Browser otvoren!"

REM Pokreni aplikaciju
call npm.cmd run dev

echo.
echo ========================================
echo.
pause

