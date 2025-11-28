@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  DIJAGNOSTIKA PROBLEMA
echo ========================================
echo.

echo 1. PROVJERA: Da li postoji package.json?
if exist "package.json" (
    echo ✅ package.json postoji
) else (
    echo ❌ package.json NE POSTOJI!
    echo    Problem: Nisi u pravilnom folderu!
    pause
    exit /b 1
)
echo.

echo 2. PROVJERA: Da li postoji node_modules?
if exist "node_modules" (
    echo ✅ node_modules postoji
) else (
    echo ❌ node_modules NE POSTOJI!
    echo    Trebam instalirati dependencies!
    call npm.cmd install
)
echo.

echo 3. PROVJERA: Da li Node.js radi?
call npm.cmd --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js radi
    call npm.cmd --version
) else (
    echo ❌ Node.js NE RADI!
    echo    Problem: Node.js nije instaliran ili nije na PATH-u!
    pause
    exit /b 1
)
echo.

echo 4. PROVJERA: Da li je port 3000 zauzet?
netstat -ano | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port 3000 je ZAUZET!
    echo    Rješenje: Zatvori aplikaciju koja koristi port 3000
    echo              ili koristi port 3001
) else (
    echo ✅ Port 3000 je SLOBODAN
)
echo.

echo 5. PROVJERA: Da li je port 3001 zauzet?
netstat -ano | findstr ":3001" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port 3001 je ZAUZET!
) else (
    echo ✅ Port 3001 je SLOBODAN
)
echo.

echo 6. PROVJERA: Da li postoji env.local?
if exist "env.local" (
    echo ✅ env.local postoji
) else (
    echo ❌ env.local NE POSTOJI!
)
echo.

echo ========================================
echo  PREPORUKA:
echo ========================================
echo.
echo Ako su sve provjere OK, pokreni:
echo   - POKRENI_3001.bat (koristi port 3001)
echo   - ili PROVJERI_I_OTVORI.bat (otvara browser automatski)
echo.
pause

