@echo off
chcp 65001 >nul
cd /d "%~dp0"

cls
echo.
echo ========================================
echo  TESTIRANJE SUPABASE POVEZANOSTI
echo ========================================
echo.

echo Provjeravam env.local...
if not exist "env.local" (
    echo ❌ env.local NE POSTOJI!
    pause
    exit /b 1
)

echo ✅ env.local postoji
echo.
echo Sadržaj env.local:
echo ========================================
type env.local
echo ========================================
echo.

echo Pokrećem test Supabase konekcije...
echo.

if exist "TEST_FINALNI.js" (
    call node TEST_FINALNI.js
    if %errorlevel% equ 0 (
        echo.
        echo ========================================
        echo  ✅ SUPABASE JE POVEZAN I RADI!
        echo ========================================
        echo.
        echo Aplikacija može spremati podatke u Supabase!
        echo.
    ) else (
        echo.
        echo ========================================
        echo  ❌ SUPABASE NIJE POVEZAN!
        echo ========================================
        echo.
        echo Provjeri:
        echo 1. Da li je URL ispravan u env.local
        echo 2. Da li je Service Role Key ispravan
        echo 3. Da li postoje tablice u Supabase Table Editor
        echo 4. Da li su RLS policies postavljene
        echo.
    )
) else (
    echo ⚠️  Test skripta ne postoji
    echo.
    echo Provjeri ručno:
    echo 1. Otvori aplikaciju u browseru
    echo 2. Popuni intake formu
    echo 3. Provjeri u Supabase Table Editor da li se podaci spremili
)

echo.
pause

