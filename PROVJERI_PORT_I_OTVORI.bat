@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  PROVJERA PORTA I POKRETANJE
echo ========================================
echo.

echo Zatvaram sve Node.js procese...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 3 >nul

echo Brišem cache...
if exist ".next" rmdir /s /q .next 2>nul

if not exist "node_modules" (
    echo Instaliram dependencies...
    call npm.cmd install
    echo.
)

echo Provjeravam port 3000...
netstat -ano | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port 3000 JE ZAUZET!
    echo.
    echo Oslobađam port...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 >nul
    echo ✅ Port oslobođen
) else (
    echo ✅ Port 3000 je slobodan
)
echo.

echo ========================================
echo  POKREĆEM APLIKACIJU
echo ========================================
echo.
echo ⚠️  SAČEKAJ 30 SEKUNDI dok se aplikacija učita!
echo.
echo Trebao bi vidjeti:
echo   - "Next.js 16.0.3"
echo   - "Local: http://localhost:3000"
echo   - "Ready" ili "Ready in X.Xs"
echo.
echo Nakon što vidiš "Ready", aplikacija radi!
echo.
echo ════════════════════════════════════════
echo.

start cmd /k "timeout /t 15 /nobreak >nul && start http://localhost:3000"

call npm.cmd run dev

echo.
echo ════════════════════════════════════════
echo.
pause

