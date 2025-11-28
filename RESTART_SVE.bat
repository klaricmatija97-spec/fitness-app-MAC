@echo off
chcp 65001 >nul
echo.
echo ========================================
echo  RESTART - ZATVARANJE SVIH NODE PROCESA
echo ========================================
echo.

echo 1. Zatvaram sve Node.js procese...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js procesi zatvoreni
) else (
    echo ℹ️  Nema Node.js procesa za zatvoriti
)
echo.

timeout /t 2 >nul

echo 2. Provjeravam port 3000...
netstat -ano | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port 3000 još uvijek zauzet - zatvaram sve procese na tom portu...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 1 >nul
)
echo.

echo 3. Port 3000 je sada slobodan!
echo.

echo 4. Pokrećem aplikaciju...
echo.
echo ════════════════════════════════════════
echo    NAKON "Ready" otvori: localhost:3000
echo ════════════════════════════════════════
echo.

cd /d "%~dp0"
call npm.cmd run dev

