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

REM Instaliraj ako treba
if not exist "node_modules" (
    echo Instaliram dependencies - sačekaj...
    call npm.cmd install
    echo.
)

REM Očisti cache
if exist ".next" rmdir /s /q .next 2>nul

REM Oslobodi port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 >nul

echo ========================================
echo  POKREĆEM...
echo ========================================
echo.
echo ⚠️  SAČEKAJ 30 SEKUNDI!
echo.
echo Trebao bi vidjeti:
echo   - Next.js 16.0.3
echo   - Local: http://localhost:3000
echo   - Ready
echo.
echo Nakon "Ready", pritisni bilo koju tipku da otvoriš browser.
echo.
echo ========================================
echo.

REM Pokreni u pozadini i čekaj
start /B cmd /c "call npm.cmd run dev"

echo Aplikacija se pokreće...
echo Čekam 30 sekundi...
timeout /t 30 /nobreak

echo.
echo Otvaram browser...
start http://localhost:3000

echo.
echo ✅ Browser je otvoren!
echo.
echo Ako ne vidiš aplikaciju, provjeri:
echo 1. Da li u konzoli piše "Ready"?
echo 2. Probaj: http://127.0.0.1:3000
echo 3. Provjeri da li port 3000 radi
echo.
pause

