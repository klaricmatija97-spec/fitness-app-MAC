@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo Pokretanje aplikacije...
echo.
echo Nakon sto vidis "Ready", otvori browser: http://localhost:3000
echo.
echo NE ZATVARAJ OVAJ PROZOR!
echo.
pause
call npm.cmd run dev

