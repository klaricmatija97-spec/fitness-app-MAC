@echo off
chcp 65001 >nul
echo.
echo ========================================
echo  TESTIRANJE SUPABASE KONEKCIJE
echo ========================================
echo.

cd /d "%~dp0"

echo Provjeravam da li Node.js postoji...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ ERROR: Node.js nije instaliran ili nije u PATH-u!
    echo.
    echo Instaliraj Node.js sa: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js pronađen!
echo.
echo Provjeravam da li env.local postoji...
if not exist "env.local" (
    echo.
    echo ❌ ERROR: env.local fajl ne postoji!
    echo.
    echo Provjeri da li env.local postoji u fitness-app folderu.
    echo.
    pause
    exit /b 1
)

echo ✅ env.local postoji!
echo.
echo Provjeravam da li su dependencies instalirani...
if not exist "node_modules" (
    echo.
    echo ⚠️  node_modules ne postoji - instaliram dependencies...
    call npm install
    echo.
)

echo ✅ Dependencies provjereni!
echo.
echo Pokrećem test konekcije...
echo.
echo ========================================
echo.

node test-supabase-connection.js

echo.
echo ========================================
echo.
pause

