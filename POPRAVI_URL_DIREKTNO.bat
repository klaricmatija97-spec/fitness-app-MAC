@echo off
chcp 65001 >nul
echo.
echo ========================================
echo  DIREKTNA POPRAVKA SUPABASE_URL
echo ========================================
echo.

cd /d "%~dp0"

if not exist "env.local" (
    echo ❌ env.local ne postoji!
    pause
    exit /b 1
)

echo Pronađem SUPABASE_URL liniju...
echo.

findstr /C:"SUPABASE_URL" env.local
echo.
echo.

echo ⚠️  Ako vidiš dashboard URL u gornjoj liniji, otvori env.local i promijeni je!
echo.
echo Promijeni liniju:
echo SUPABASE_URL=https://supabase.com/dashboard/project/...
echo.
echo Na:
echo SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co
echo.
echo Nakon promjene, SAČUVAJ FAJL (Ctrl+S) i pokreni TEST_FINALNI.bat
echo.
pause

