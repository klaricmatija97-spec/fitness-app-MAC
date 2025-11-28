@echo off
chcp 65001 >nul
title CORPEX - Pokretanje
color 0A
cls

echo.
echo ============================================
echo        CORPEX - Pokretanje Aplikacije
echo ============================================
echo.

REM Pronađi folder gdje se nalazi ovaj batch fajl
cd /d "%~dp0"
echo 📁 Folder: %CD%
echo.

REM Provjeri da li postoji package.json
if not exist "package.json" (
    echo ❌ GREŠKA: package.json nije pronađen!
    echo.
    echo Provjeri da li si u pravilnom folderu.
    echo Trebao bi biti u: fitness-app folderu
    echo.
    pause
    exit /b 1
)
echo ✅ package.json pronađen
echo.

REM Provjeri da li postoji Node.js
if exist "C:\Program Files\nodejs\npm.cmd" (
    set "NPM=C:\Program Files\nodejs\npm.cmd"
    echo ✅ Node.js pronađen: C:\Program Files\nodejs
) else if exist "C:\Program Files (x86)\nodejs\npm.cmd" (
    set "NPM=C:\Program Files (x86)\nodejs\npm.cmd"
    echo ✅ Node.js pronađen: C:\Program Files (x86)\nodejs
) else (
    echo ❌ GREŠKA: Node.js nije pronađen!
    echo.
    echo Instaliraj Node.js s: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo.

echo ⏳ Pokrećem Next.js dev server...
echo.
echo ════════════════════════════════════════════
echo.
echo 📌 NAKON što vidiš "Ready" ili "Local: http://localhost:3000"
echo    Otvori browser i upiši: localhost:3000
echo.
echo ⚠️  VAŽNO: NE ZATVARAJ OVAJ PROZOR dok aplikacija radi!
echo.
echo ════════════════════════════════════════════
echo.

%NPM% run dev

if %errorlevel% neq 0 (
    echo.
    echo ❌ GREŠKA: Aplikacija se nije mogla pokrenuti!
    echo.
    echo Provjeri:
    echo 1. Da li je Node.js instaliran?
    echo 2. Da li si u pravilnom folderu?
    echo 3. Da li postoje svi potrebni fajlovi?
    echo.
    pause
)


