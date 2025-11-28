@echo off
chcp 65001 >nul
echo.
echo ========================================
echo  POPRAVKA SUPABASE_URL - DIREKTNO
echo ========================================
echo.

cd /d "%~dp0"

if not exist "env.local" (
    echo ❌ env.local ne postoji!
    pause
    exit /b 1
)

echo Trenutni sadržaj env.local:
echo ========================================
type env.local
echo ========================================
echo.

echo Provjeravam SUPABASE_URL liniju...
echo.

findstr /C:"SUPABASE_URL" env.local > temp_url.txt
findstr /C:"SUPABASE_URL" env.local

echo.

for /f "tokens=2 delims==" %%a in (temp_url.txt) do (
    set CURRENT_URL=%%a
)

del temp_url.txt

echo.
echo ========================================
echo  POPRAVLJAM URL...
echo ========================================
echo.

REM Napravi backup
copy env.local env.local.backup >nul

REM Zamijeni SUPABASE_URL liniju
powershell -Command "(Get-Content 'env.local') -replace 'SUPABASE_URL=.*', 'SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co' | Set-Content 'env.local'"

echo ✅ URL je popravljen!
echo.

echo Novi sadržaj env.local:
echo ========================================
type env.local
echo ========================================
echo.

echo ✅ Gotovo! Sačuvano backup kao env.local.backup
echo.
echo Sada pokreni TEST_FINALNI.bat za testiranje!
echo.
pause

