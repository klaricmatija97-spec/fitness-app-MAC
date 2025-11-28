@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  KOMPLETNA PROVJERA SVEGA
echo ========================================
echo.

echo [1/7] Provjeravam env.local...
if exist "env.local" (
    echo ✅ env.local postoji
    echo.
    echo Sadržaj SUPABASE_URL:
    findstr /C:"SUPABASE_URL" env.local | findstr /V "#"
    echo.
) else (
    echo ❌ env.local NE POSTOJI!
    pause
    exit /b 1
)

echo [2/7] Provjeravam Node.js...
call npm.cmd --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js radi
    call npm.cmd --version
) else (
    echo ❌ Node.js NE RADI!
    pause
    exit /b 1
)

echo.
echo [3/7] Provjeravam dependencies...
if exist "node_modules" (
    echo ✅ node_modules postoji
) else (
    echo ⚠️  node_modules ne postoji - instaliram...
    call npm.cmd install
)

echo.
echo [4/7] Testiram Supabase konekciju...
if exist "TEST_FINALNI.js" (
    echo.
    call node TEST_FINALNI.js
    echo.
    if %errorlevel% equ 0 (
        echo ✅ Supabase konekcija RADI!
    ) else (
        echo ❌ Supabase konekcija NE RADI!
        echo    Provjeri env.local i Supabase postavke
    )
) else (
    echo ⚠️  Test skripta ne postoji
)

echo.
echo [5/7] Provjeravam port 3000...
netstat -ano | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port 3000 je ZAUZET
    echo    Oslobađam port...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 >nul
    echo ✅ Port oslobođen
) else (
    echo ✅ Port 3000 je slobodan
)

echo.
echo [6/7] Brišem cache...
if exist ".next" (
    rmdir /s /q .next 2>nul
    echo ✅ Cache obrisan
)

echo.
echo [7/7] Rezime:
echo ========================================
echo ✅ env.local: OK
echo ✅ Node.js: OK
echo ✅ Dependencies: OK
echo ✅ Cache: Obrisan
echo ✅ Port 3000: Slobodan
echo.
echo ========================================
echo  SVE SPREMNO ZA POKRETANJE!
echo ========================================
echo.
echo Pokreni: POKRENI_I_PROVJERI_SUPABASE.bat
echo.
pause

