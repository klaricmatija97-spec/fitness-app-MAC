@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  PROVJERA I POKRETANJE APLIKACIJE
echo ========================================
echo.

echo 1. Provjeravam dependencies...
if not exist "node_modules" (
    echo ❌ node_modules ne postoji - instaliram...
    call npm.cmd install
    echo.
) else (
    echo ✅ node_modules postoji
)
echo.

echo 2. Brišem .next cache (možda je problem u cache-u)...
if exist ".next" (
    rmdir /s /q .next 2>nul
    echo ✅ .next cache obrisan
) else (
    echo ℹ️  .next ne postoji
)
echo.

echo 3. Provjeravam env.local...
if exist "env.local" (
    echo ✅ env.local postoji
) else (
    echo ❌ env.local NE POSTOJI!
    pause
    exit /b 1
)
echo.

echo 4. Provjeravam da li je port 3000 zauzet...
netstat -ano | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port 3000 je zauzet!
    echo.
    echo Ako već imaš pokrenutu aplikaciju, zatvori je prvo (Ctrl+C u tom prozoru)
    echo ili pokreni ovu aplikaciju na drugom portu.
    echo.
    pause
) else (
    echo ✅ Port 3000 je slobodan
)
echo.

echo ========================================
echo  POKREĆEM APLIKACIJU...
echo ========================================
echo.
echo ⚠️  VAŽNO:
echo    - Ako vidiš grešku, pošalji mi cijelu poruku!
echo    - Ako ne vidiš ništa, možda se učitava (sačekaj 30 sekundi)
echo    - Ako se zaglavilo, pritisni Ctrl+C i pokreni ponovno
echo.
echo ════════════════════════════════════════
echo.

call npm.cmd run dev

echo.
echo ════════════════════════════════════════
echo.
echo Ako je došlo do greške, gore vidiš detalje.
echo.
pause

