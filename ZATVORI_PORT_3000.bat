@echo off
chcp 65001 >nul
echo.
echo ========================================
echo  ZATVARANJE PROCESA NA PORTU 3000
echo ========================================
echo.

echo Provjeravam koji proces koristi port 3000...
echo.

netstat -ano | findstr ":3000" > temp_port.txt

if not exist temp_port.txt (
    echo ✅ Port 3000 je slobodan!
    goto :pokreni
)

echo Pronađeni procesi na portu 3000:
type temp_port.txt
echo.

echo Zatvaram procese...
echo.

for /f "tokens=5" %%a in (temp_port.txt) do (
    echo Zatvaram proces ID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

del temp_port.txt

timeout /t 2 >nul

echo ✅ Procesi su zatvoreni!
echo.

:pokreni
echo Sada pokrećem aplikaciju...
echo.
pause

cd /d "%~dp0"
call npm.cmd run dev

