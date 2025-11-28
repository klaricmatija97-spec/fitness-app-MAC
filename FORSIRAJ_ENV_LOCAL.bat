@echo off
chcp 65001 >nul
echo.
echo ========================================
echo  FORSIRANJE ENV.LOCAL - ZANEMARI SISTEM
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
echo ========================================
echo  Sadržaj env.local:
echo ========================================
type env.local
echo.
echo ========================================
echo.

echo Provjeravam SUPABASE_URL...
findstr /C:"SUPABASE_URL" env.local
echo.

echo ⚠️  VAŽNO: Ako URL sadrži "/dashboard", PROMIJENI GA!
echo.
echo Otvori env.local i provjeri da linija izgleda ovako:
echo SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co
echo.
echo NE smije sadržavati:
echo - /dashboard
echo - /settings
echo - supabase.com/dashboard
echo.
pause

