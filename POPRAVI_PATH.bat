@echo off
chcp 65001 >nul
title CORPEX - Popravljeno
cls

echo ========================================
echo   POPRAVKA - Dodavanje Node.js na PATH
echo ========================================
echo.

REM Dodaj Node.js na PATH za ovu sesiju
set "PATH=%PATH%;C:\Program Files\nodejs"

REM Navigiraj u folder
cd /d "%~dp0"

echo ✅ Node.js dodan na PATH
echo ✅ Folder: %CD%
echo.

REM Provjeri da li node radi
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js još uvijek nije pronađen!
    echo.
    echo Provjeri da li je Node.js instaliran u:
    echo C:\Program Files\nodejs
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js radi!
echo.

echo ════════════════════════════════════════
echo   POKRETANJE APLIKACIJE...
echo ════════════════════════════════════════
echo.
echo ⏳ Pričekaj "Ready" (20-30 sekundi)...
echo.
echo NE ZATVARAJ OVAJ PROZOR!
echo.

npm run dev

if %errorlevel% neq 0 (
    echo.
    echo ❌ GREŠKA!
    echo.
    echo Kopiraj cijelu grešku iznad i pošalji mi.
    echo.
    pause
)

