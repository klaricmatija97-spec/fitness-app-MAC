@echo off
chcp 65001 >nul
cls
echo ========================================
echo   TEST - Provjera Aplikacije
echo ========================================
echo.

cd /d "%~dp0"
echo Folder: %CD%
echo.

echo Provjeravam Node.js...
if exist "C:\Program Files\nodejs\npm.cmd" (
    echo ✅ Node.js pronađen
    set "NPM=C:\Program Files\nodejs\npm.cmd"
) else (
    echo ❌ Node.js NIJE pronađen!
    pause
    exit /b 1
)
echo.

echo Provjeravam package.json...
if exist "package.json" (
    echo ✅ package.json pronađen
) else (
    echo ❌ package.json NIJE pronađen!
    pause
    exit /b 1
)
echo.

echo Provjeravam env.local...
if exist "env.local" (
    echo ✅ env.local pronađen
) else (
    echo ⚠️  env.local NIJE pronađen (možda je OK)
)
echo.

echo Provjeravam data/common-questions.json...
if exist "data\common-questions.json" (
    echo ✅ common-questions.json pronađen
) else (
    echo ❌ common-questions.json NIJE pronađen!
    pause
    exit /b 1
)
echo.

echo ════════════════════════════════════════
echo   POKRETANJE APLIKACIJE...
echo ════════════════════════════════════════
echo.
echo Ako vidiš grešku, kopiraj cijelu poruku!
echo.
echo ⏳ Pričekaj da vidiš "Ready" (može potrajati 30 sekundi)...
echo.
echo ⚠️  NE ZATVARAJ OVAJ PROZOR!
echo.

%NPM% run dev

if %errorlevel% neq 0 (
    echo.
    echo ❌ GREŠKA: Aplikacija se nije mogla pokrenuti!
    echo.
    echo Provjeri grešku iznad i pošalji mi poruku.
    echo.
    pause
)

