@echo off
chcp 65001 >nul
cd /d "%~dp0"

cls
echo.
echo ========================================
echo  POKRETANJE APLIKACIJE
echo ========================================
echo.

echo Zatvaram sve Node.js procese...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul
echo ✅ Gotovo
echo.

echo Provjeravam env.local...
if not exist "env.local" (
    echo Kreiranje env.local...
    echo SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co > env.local
    echo SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcHVhdW5ldWJvZHRodnJtenFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ4MTk4MiwiZXhwIjoyMDc5MDU3OTgyfQ.zAlBJK9S07C5PGWNZGiQ0H4qbEPZ6SYw6yuU-kLvVcc >> env.local
    echo ✅ Kreiran
) else (
    echo ✅ env.local postoji
)
echo.

echo Provjeravam dependencies...
if not exist "node_modules" (
    echo Instaliram dependencies - sačekaj 1-2 minute...
    call npm.cmd install
    echo.
) else (
    echo ✅ Dependencies postoje
)
echo.

echo Čistim cache...
if exist ".next" (
    rmdir /s /q .next 2>nul
    echo ✅ Cache obrisan
) else (
    echo ✅ Cache je čist
)
echo.

echo Oslobađam port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 >nul
echo ✅ Port oslobođen
echo.

echo ========================================
echo  POKREĆEM APLIKACIJU...
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

REM Otvori browser nakon 35 sekundi
start /B cmd /c "timeout /t 35 /nobreak >nul && start http://localhost:3000"

REM Pokreni aplikaciju
call npm.cmd run dev

pause

