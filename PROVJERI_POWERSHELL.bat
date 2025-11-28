@echo off
chcp 65001 >nul
cls
cd /d "%~dp0"

echo.
echo ========================================
echo  PROVJERA POWERSHELL EXECUTION POLICY
echo ========================================
echo.

echo Provjeravam PowerShell execution policy...
echo.

powershell -Command "Get-ExecutionPolicy"
echo.

powershell -Command "Get-ExecutionPolicy -List"
echo.

echo ========================================
echo  REZULTAT:
echo ========================================
echo.

powershell -Command "Get-ExecutionPolicy" | findstr /I "Restricted" >nul
if %errorlevel% equ 0 (
    echo ⚠️  PowerShell je BLOKIRAN (Restricted)!
    echo.
    echo Rješenje 1: Koristi .bat fajlove (ne .ps1)
    echo Rješenje 2: Pokreni batch fajl iz CMD-a, ne PowerShell-a
    echo Rješenje 3: Promijeni execution policy (zahtijeva admin)
    echo.
    echo Preporuka: Koristi batch fajlove (.bat) - oni NE zahtijevaju PowerShell!
    echo.
) else (
    echo ✅ PowerShell NIJE blokiran
    echo    Možeš koristiti i batch fajlove i PowerShell skripte
    echo.
)

echo ========================================
echo  KAKO POKRENUTI APLIKACIJU:
echo ========================================
echo.
echo 1. Koristi batch fajlove (.bat) - NE zahtijevaju PowerShell!
echo    - POKRENI_SADA.bat
echo    - POKRENI_RUCNO.bat
echo    - KOMPLETNA_PROVJERA_I_POKRETANJE.bat
echo.
echo 2. Ili koristi Command Prompt (CMD):
echo    - Pritisni Win + R
echo    - Upiši: cmd
echo    - U CMD-u upiši:
echo      cd "C:\Users\jasmi\Documents\Česta pitanja\fitness-app"
echo      npm run dev
echo.
echo ========================================
echo.

pause

