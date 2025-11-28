@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  AUTOMATSKO POKRETANJE I TESTIRANJE
echo ========================================
echo.

echo 1. Zatvaram sve Node.js procese...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 3 >nul
echo ✅ Node.js procesi zatvoreni
echo.

echo 2. Provjeravam env.local...
if exist "env.local" (
    echo ✅ env.local postoji
    echo.
    echo Provjeravam SUPABASE_URL...
    findstr /C:"SUPABASE_URL" env.local | findstr /V "#" | findstr /C:"supabase.co"
    if %errorlevel% equ 0 (
        echo ✅ SUPABASE_URL izgleda ispravno
    ) else (
        echo ❌ SUPABASE_URL NE IZGLEDA ISPRAVNO!
        echo.
        echo Provjeravam sadržaj...
        type env.local | findstr SUPABASE_URL
    )
) else (
    echo ❌ env.local NE POSTOJI!
    pause
    exit /b 1
)
echo.

echo 3. Provjeravam dependencies...
if not exist "node_modules" (
    echo ⚠️  node_modules ne postoji - instaliram...
    call npm.cmd install
    echo.
) else (
    echo ✅ node_modules postoji
)
echo.

echo 4. Brišem cache...
if exist ".next" (
    rmdir /s /q .next 2>nul
    echo ✅ Cache obrisan
) else (
    echo ℹ️  Cache ne postoji
)
echo.

echo 5. Oslobađam port 3000...
netstat -ano | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port 3000 je zauzet - oslobađam...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 >nul
    echo ✅ Port oslobođen
) else (
    echo ✅ Port 3000 je slobodan
)
echo.

echo 6. Testiram Supabase konekciju...
echo.
call npm.cmd run --silent test:supabase 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Test skripta ne postoji, ali to je OK
    echo    Provjerit ćemo konekciju kroz aplikaciju
)
echo.

echo ========================================
echo  POKREĆEM APLIKACIJU
echo ========================================
echo.
echo ⚠️  SAČEKAJ 30 SEKUNDI dok se aplikacija učita!
echo.
echo Trebao bi vidjeti:
echo   - "Next.js 16.0.3"
echo   - "Local: http://localhost:3000"
echo   - "Ready" ili "Ready in X.Xs"
echo.
echo Nakon "Ready", automatski ću otvoriti browser
echo i testirati Supabase konekciju kroz aplikaciju.
echo.
echo ════════════════════════════════════════
echo.

REM Pokreni aplikaciju u pozadini i čekaj 30 sekundi
start /B cmd /c "call npm.cmd run dev > app_output.txt 2>&1"

echo Pokrenuo sam aplikaciju u pozadini...
echo Čekam 30 sekundi da se učita...
echo.

timeout /t 30 /nobreak >nul

echo Provjeravam da li aplikacija radi...
echo.

netstat -ano | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo ✅ Aplikacija je pokrenuta na portu 3000!
    echo.
    echo Otvaram browser...
    start "" "http://localhost:3000"
    echo.
    echo ✅ Browser je otvoren!
    echo.
    echo ========================================
    echo  ŠTO SADA RADITI:
    echo ========================================
    echo.
    echo 1. U browseru, trebao bi vidjeti CORPEX aplikaciju
    echo 2. Popuni intake formu (prvi dio aplikacije)
    echo 3. Provjeri u Supabase Table Editor da li se podaci spremili
    echo.
    echo Ako vidiš aplikaciju u browseru:
    echo   ✅ Aplikacija radi!
    echo   ✅ Povezanost sa Supabase će se testirati kad popuniš formu
    echo.
    echo Ako ne vidiš aplikaciju:
    echo   ❌ Provjeri app_output.txt za greške
    echo.
) else (
    echo ❌ Aplikacija se nije pokrenula!
    echo.
    echo Provjeravam greške...
    if exist "app_output.txt" (
        echo ========================================
        echo  GREŠKE:
        echo ========================================
        type app_output.txt
    ) else (
        echo Nema outputa - aplikacija se možda nije pokrenula
    )
)

echo.
echo ════════════════════════════════════════
echo.
echo Pritisni Enter da zaustaviš aplikaciju...
pause >nul

taskkill /F /IM node.exe >nul 2>&1
if exist "app_output.txt" del app_output.txt

