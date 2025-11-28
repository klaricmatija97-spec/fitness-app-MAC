@echo off
cd /d "%~dp0"

echo.
echo ========================================
echo  POKRETANJE APLIKACIJE
echo ========================================
echo.

REM Zatvori sve Node.js procese
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

REM Instaliraj ako treba
if not exist "node_modules" (
    echo Instaliram dependencies...
    call npm.cmd install
    echo.
)

REM Očisti cache
if exist ".next" rmdir /s /q .next 2>nul

REM Oslobodi port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 >nul

echo.
echo ========================================
echo  POKREĆEM...
echo ========================================
echo.
echo SAČEKAJ dok ne vidiš:
echo   - Next.js 16.0.3
echo   - Local: http://localhost:3000
echo   - Ready in X.Xs
echo.
echo NAKON "Ready", browser će se automatski otvoriti!
echo.
echo Ako se ne otvori, ručno otvori:
echo   http://localhost:3000
echo.
echo ========================================
echo.
pause

REM Pokreni aplikaciju i otvori browser nakon 35 sekundi
start /B cmd /c "timeout /t 35 /nobreak >nul && start http://localhost:3000"

call npm.cmd run dev

