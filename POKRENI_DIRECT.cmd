@echo off
cd /d "%~dp0"

REM Zatvori sve
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

REM Instaliraj ako treba
if not exist "node_modules" npm install

REM Očisti
if exist ".next" rmdir /s /q .next 2>nul

REM Oslobodi port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 >nul

echo Pokrećem aplikaciju...
echo Sačekaj "Ready", zatim otvori: http://localhost:3000
echo.

npm run dev

