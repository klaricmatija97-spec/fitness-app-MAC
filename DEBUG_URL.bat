@echo off
chcp 65001 >nul
echo.
echo ========================================
echo  DEBUG - Provjera env.local
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

echo Tražim SUPABASE_URL...
findstr /C:"SUPABASE_URL" env.local
echo.
echo.

pause

