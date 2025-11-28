@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  PROVJERA I POKRETANJE APLIKACIJE
echo ========================================
echo.

echo 1. Zatvaram sve Node.js procese...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul
echo ✅ Zatvoreno
echo.

echo 2. Brišem cache...
if exist ".next" (
    rmdir /s /q .next 2>nul
    echo ✅ Cache obrisan
) else (
    echo ℹ️  Cache ne postoji
)
echo.

echo 3. Provjeravam dependencies...
if not exist "node_modules" (
    echo ⚠️  Instaliram dependencies...
    call npm.cmd install
    echo.
)
echo ✅ Dependencies provjereni
echo.

echo 4. Provjeravam port 3000...
netstat -ano | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port 3000 je zauzet - koristit ću port 3001
    set PORT=3001
) else (
    echo ✅ Port 3000 je slobodan
    set PORT=3000
)
echo.

echo ========================================
echo  POKREĆEM APLIKACIJU NA PORTU %PORT%
echo ========================================
echo.
echo ⚠️  SAČEKAJ dok ne vidiš "Ready" ili "Local: http://localhost:%PORT%"
echo    Ovo može potrajati 10-30 sekundi!
echo.
echo ════════════════════════════════════════
echo.

if %PORT%==3001 (
    start "" "http://localhost:3001"
    call npm.cmd run dev -- -p 3001
) else (
    start "" "http://localhost:3000"
    call npm.cmd run dev
)

