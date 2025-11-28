@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  PROVJERA ZAŠTO SE NE POKREĆE
echo ========================================
echo.

echo 1. Provjeravam da li postoji package.json...
if exist "package.json" (
    echo ✅ package.json postoji
) else (
    echo ❌ package.json NE POSTOJI!
    pause
    exit /b 1
)
echo.

echo 2. Provjeravam da li postoji node_modules...
if exist "node_modules" (
    echo ✅ node_modules postoji
) else (
    echo ❌ node_modules NE POSTOJI!
    echo.
    echo ⚠️  Trebam instalirati dependencies...
    echo.
    pause
    call npm.cmd install
    echo.
)
echo.

echo 3. Provjeravam da li postoji .next folder...
if exist ".next" (
    echo ✅ .next postoji
    echo.
    echo ⚠️  Možda je potrebno rebuildati - brišem .next...
    rmdir /s /q .next 2>nul
    echo ✅ .next obrisan
) else (
    echo ℹ️  .next ne postoji (to je OK za prvo pokretanje)
)
echo.

echo 4. Provjeravam da li je port 3000 zauzet...
netstat -ano | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port 3000 je zauzet!
    echo.
    echo Provjeri da li već imaš pokrenutu aplikaciju.
    echo.
) else (
    echo ✅ Port 3000 je slobodan
)
echo.

echo 5. Provjeravam Next.js verziju...
call npm.cmd list next 2>nul
echo.

echo ========================================
echo  POKREĆEM APLIKACIJU S DETALJNIM OUTPUT-OM
echo ========================================
echo.
echo Nakon sto vidis grešku ili "Ready", pritisni Ctrl+C da zaustaviš
echo.
pause

call npm.cmd run dev

