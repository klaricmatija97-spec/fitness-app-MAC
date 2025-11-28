@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  DETALJNA PROVJERA APLIKACIJE
echo ========================================
echo.

echo 1. Zatvaram sve Node.js procese...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul
echo ✅ Zatvoreno
echo.

echo 2. Provjeravam da li postoje dependencies...
if not exist "node_modules" (
    echo ❌ node_modules ne postoji - instaliram...
    call npm.cmd install
    echo.
)
echo ✅ Dependencies provjereni
echo.

echo 3. Brišem cache...
if exist ".next" (
    rmdir /s /q .next 2>nul
    echo ✅ Cache obrisan
)
echo.

echo 4. Provjeravam da li mogu pokrenuti Next.js...
echo    Pokušavam pokrenuti na 5 sekundi...
echo.

start /B cmd /c "call npm.cmd run dev > test_output.txt 2>&1"
timeout /t 8 >nul

if exist "test_output.txt" (
    echo ========================================
    echo  OUTPUT IZ NEXT.JS:
    echo ========================================
    type test_output.txt
    echo ========================================
    echo.
) else (
    echo ❌ Next.js se nije pokrenuo - nema outputa!
)

taskkill /F /IM node.exe >nul 2>&1
if exist "test_output.txt" del test_output.txt

echo.
echo 5. Provjeravam port 3000...
netstat -ano | findstr ":3000"
echo.

pause

