@echo off
cd /d "%~dp0"

cls
echo.
echo ========================================
echo  POKRETANJE APLIKACIJE
echo ========================================
echo.

REM Zatvori procese
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

REM Provjeri env.local
if not exist "env.local" (
    echo SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co > env.local
    echo SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcHVhdW5ldWJvZHRodnJtenFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ4MTk4MiwiZXhwIjoyMDc5MDU3OTgyfQ.zAlBJK9S07C5PGWNZGiQ0H4qbEPZ6SYw6yuU-kLvVcc >> env.local
)

REM Instaliraj ako treba
if not exist "node_modules" (
    echo Instaliram dependencies...
    call npm.cmd install
)

REM Očisti
if exist ".next" rmdir /s /q .next 2>nul

REM Port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 >nul

echo.
echo ========================================
echo  POKREĆEM...
echo ========================================
echo.
echo SAČEKAJ dok ne vidiš "Ready"!
echo.
echo Nakon "Ready", otvori browser:
echo   http://localhost:3000
echo.
echo ========================================
echo.
pause

call npm.cmd run dev

pause
