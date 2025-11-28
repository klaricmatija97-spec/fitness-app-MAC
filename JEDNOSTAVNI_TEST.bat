@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  JEDNOSTAVNI TEST - PROVJERA GREŠKE
echo ========================================
echo.

echo Zatvaram sve Node.js procese...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo Brišem cache...
if exist ".next" rmdir /s /q .next 2>nul

echo.
echo ========================================
echo  POKREĆEM - PAZI NA GREŠKE!
echo ========================================
echo.
echo ⚠️  Ako vidiš grešku, KOPIRAJ CIJELU PORUKU!
echo.
echo ⚠️  Ako se zaglavi, pritisni Ctrl+C
echo.
echo ════════════════════════════════════════
echo.

call npm.cmd run dev 2>&1 | tee output.log

echo.
echo ════════════════════════════════════════
echo.
echo Output je spremljen u output.log
echo.
pause

