@echo off
chcp 65001 >nul
echo.
echo ========================================
echo  POPRAVKA SUPABASE_URL U ENV.LOCAL
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
echo Trenutni SUPABASE_URL:
findstr /C:"SUPABASE_URL" env.local
echo.
echo.
echo ⚠️  VAŽNO: Provjeri da URL nije dashboard URL!
echo.
echo ❌ POGREŠNO (ne kopiraj ovaj):
echo    https://supabase.com/dashboard/project/...
echo    https://supabase.com/dashboard/...
echo.
echo ✅ ISPRAVNO (kopiraj ovaj):
echo    https://zspuauneubodthvrmzqg.supabase.co
echo.
echo.
echo Ako je URL pogrešan, otvori env.local i popravi ga!
echo.
pause

