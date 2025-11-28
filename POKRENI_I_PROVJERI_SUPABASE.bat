@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  POKRETANJE I PROVJERA SUPABASE
echo ========================================
echo.

echo 1. Provjeravam env.local...
if not exist "env.local" (
    echo ❌ env.local NE POSTOJI!
    pause
    exit /b 1
)

echo ✅ env.local postoji
echo.
echo Sadržaj env.local:
echo ========================================
type env.local
echo ========================================
echo.

echo 2. Testiram Supabase konekciju PRIJE pokretanja...
echo.
if exist "TEST_FINALNI.bat" (
    call TEST_FINALNI.bat
    echo.
    echo Ako je test uspješan, Supabase je povezan!
    echo.
    pause
    echo.
) else (
    echo ⚠️  Test skripta ne postoji - nastavljam s pokretanjem
)
echo.

echo 3. Zatvaram sve Node.js procese...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo 4. Brišem cache...
if exist ".next" rmdir /s /q .next 2>nul

echo 5. Oslobađam port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 >nul

echo.
echo ========================================
echo  POKREĆEM APLIKACIJU
echo ========================================
echo.
echo ⚠️  VAŽNO:
echo    1. SAČEKAJ "Ready" ili "Local: http://localhost:3000"
echo    2. Otvori browser: http://localhost:3000
echo    3. Popuni intake formu
echo    4. Provjeri u Supabase Table Editor da li se podaci spremili
echo.
echo ════════════════════════════════════════
echo.

REM Otvori browser nakon 20 sekundi
start /B cmd /c "timeout /t 20 /nobreak >nul && start http://localhost:3000"

call npm.cmd run dev

echo.
echo ════════════════════════════════════════
echo.
pause

