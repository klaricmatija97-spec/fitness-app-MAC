@echo off
chcp 65001 >nul
echo.
echo ========================================
echo  KOMPLETNO POPRAVKANJE SUPABASE POVEZIVANJA
echo ========================================
echo.

cd /d "%~dp0"

echo 1. Provjeravam environment varijable...
echo.

if not exist "env.local" (
    echo ❌ env.local ne postoji!
    pause
    exit /b 1
)

echo ✅ env.local postoji
echo.

echo 2. Provjeravam da li su dependencies instalirani...
echo.

if not exist "node_modules" (
    echo ⚠️  Instaliram dependencies...
    call npm.cmd install
    echo.
)

echo ✅ Dependencies provjereni
echo.

echo 3. Provjeravam varijable (bez async/await)...
echo.
echo ========================================
echo.

node TEST_VARIJABLE.js

echo.
echo ========================================
echo.

echo 4. Testiram konekciju sa Supabase...
echo.

if %ERRORLEVEL% EQU 0 (
    node TEST_SIMPLE.js
)

echo.
echo ========================================
echo.

if %ERRORLEVEL% EQU 0 (
    echo 4. Testiram INSERT operaciju...
    echo.
    node TEST_INSERT.js
)

echo.
echo ========================================
echo.
echo 4. Ako test prolazi - sve radi!
echo    Ako test ne prolazi - provjeri:
echo     - Da li su policies postavljene (pokreni POPRAVI_SVE.sql u Supabase)
echo     - Da li su URL i Key ispravni u env.local
echo.
pause

