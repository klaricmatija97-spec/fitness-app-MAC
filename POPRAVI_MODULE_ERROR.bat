@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  POPRAVKA MODULE ERROR - CLEAN INSTALL
echo ========================================
echo.

echo 1. Zatvaram sve Node.js procese...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul
echo ✅ Node.js procesi zatvoreni
echo.

echo 2. Brišem .next cache...
if exist ".next" (
    rmdir /s /q .next 2>nul
    echo ✅ .next obrisan
) else (
    echo ℹ️  .next ne postoji
)
echo.

echo 3. Brišem node_modules...
if exist "node_modules" (
    echo ⚠️  Ovo može potrajati nekoliko sekundi...
    rmdir /s /q node_modules 2>nul
    echo ✅ node_modules obrisan
) else (
    echo ℹ️  node_modules ne postoji
)
echo.

echo 4. Brišem package-lock.json...
if exist "package-lock.json" (
    del /f /q package-lock.json 2>nul
    echo ✅ package-lock.json obrisan
) else (
    echo ℹ️  package-lock.json ne postoji
)
echo.

echo 5. Instaliram dependencies (ovo može potrajati 1-2 minute)...
echo.
call npm.cmd install
echo.

if %errorlevel% neq 0 (
    echo ❌ Instalacija neuspješna!
    pause
    exit /b 1
)

echo ✅ Dependencies instalirani!
echo.

echo 6. Pokrećem aplikaciju...
echo.
echo ════════════════════════════════════════
echo    NAKON "Ready" otvori: localhost:3000
echo ════════════════════════════════════════
echo.

call npm.cmd run dev

