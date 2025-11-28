@echo off
chcp 65001 >nul
echo.
echo ========================================
echo  PROVJERA SVIH ENVIRONMENT VARIJABLI
echo ========================================
echo.

cd /d "%~dp0"

echo 1. PROVJERA ENV.LOCAL FAJLA:
echo ========================================
echo.
type env.local
echo.
echo ========================================
echo.

echo 2. PROVJERA WINDOWS ENVIRONMENT VARIJABLE:
echo ========================================
echo.
set | findstr /I "SUPABASE"
echo.
echo ========================================
echo.

echo 3. DIREKTNO ČITANJE IZ FAJLA:
echo ========================================
echo.
for /f "tokens=2 delims==" %%a in ('findstr /C:"SUPABASE_URL" env.local') do (
    echo SUPABASE_URL iz fajla: %%a
)
echo.
echo ========================================
echo.

echo 4. PROVJERA DA LI POSTOJI .env ILI .env.local:
echo ========================================
echo.
if exist ".env" (
    echo ⚠️  .env postoji! To se može učitati prije env.local!
    type .env
) else (
    echo ✅ .env ne postoji
)
echo.
if exist ".env.local" (
    echo ⚠️  .env.local postoji! To se može učitati prije env.local!
    type .env.local
) else (
    echo ✅ .env.local ne postoji
)
echo.
echo ========================================
echo.

pause

