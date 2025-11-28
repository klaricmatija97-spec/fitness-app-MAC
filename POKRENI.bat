@echo off
cd /d "%~dp0"

echo Pokretanje aplikacije...
echo.

taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

if not exist "node_modules" (
    echo Instaliram dependencies...
    call npm.cmd install
    echo.
)

if exist ".next" rmdir /s /q .next 2>nul

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 >nul

echo Pokrećem aplikaciju na http://localhost:3000
echo Sačekaj dok ne vidiš "Ready"
echo Zatim otvori browser: http://localhost:3000
echo.
pause

call npm.cmd run dev
