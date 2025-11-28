@echo off
chcp 65001 >nul
echo.
echo ========================================
echo  PROVJERA SUPABASE_URL FORMATA
echo ========================================
echo.

cd /d "%~dp0"

echo Provjeravam env.local fajl...
echo.

if not exist "env.local" (
    echo ❌ env.local ne postoji!
    pause
    exit /b 1
)

echo ✅ env.local postoji!
echo.
echo Sadržaj SUPABASE_URL linije:
echo.
findstr /C:"SUPABASE_URL" env.local
echo.
echo.
echo Provjeri da li URL:
echo   - Počinje s: https://
echo   - Završava s: .supabase.co
echo   - NEMA: /rest/v1 na kraju
echo   - NEMA: / na kraju (osim ako nije dio domena)
echo.
echo Primjer ispravnog formata:
echo   SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co
echo.
pause

