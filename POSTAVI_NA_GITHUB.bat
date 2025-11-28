@echo off
chcp 65001 >nul
echo ====================================
echo POSTAVLJANJE PROJEKTA NA GITHUB
echo ====================================
echo.

cd /d "%~dp0"

echo Provjeravam Git instalaciju...
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git nije instaliran!
    echo Instaliraj Git sa: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo [OK] Git je instaliran
echo.

echo Provjeravam postoje li vec Git repozitorij...
if exist .git (
    echo [INFO] Git repozitorij vec postoji
    echo.
    echo Trenutni remote:
    git remote -v
    echo.
    echo Zeliš li dodati novi remote? (D/N)
    set /p addRemote=
    if /i "%addRemote%"=="D" (
        echo.
        echo Unesi GitHub URL (npr. https://github.com/TvojeKorisnickoIme/fitness-app.git):
        set /p gitUrl=
        git remote add origin %gitUrl%
        echo Remote dodat!
    )
) else (
    echo Inicijaliziram Git repozitorij...
    git init
    echo [OK] Git inicijaliziran
    echo.
    echo UNOSI PODATKE ZA GITHUB:
    echo =========================
    echo Unesi GitHub URL repozitorija (npr. https://github.com/TvojeKorisnickoIme/fitness-app.git):
    echo ILI ostavi prazno ako zelis samo commitati lokalno
    set /p gitUrl=
    echo.
    
    echo Dodajem sve datoteke...
    git add .
    echo [OK] Datoteke dodane
    echo.
    
    echo Napraviti prvi commit...
    git commit -m "Initial commit - CORPEX Fitness App"
    echo [OK] Commit napravljen
    echo.
    
    if not "%gitUrl%"=="" (
        echo Dodajem remote...
        git remote add origin %gitUrl%
        echo [OK] Remote dodat
        echo.
        
        echo Postavljam main branch...
        git branch -M main
        echo [OK] Branch postavljen
        echo.
        
        echo PUSH NA GITHUB:
        echo ===============
        echo Zeliš li pushati na GitHub? (D/N)
        set /p pushGitHub=
        if /i "%pushGitHub%"=="D" (
            echo Pusham na GitHub...
            git push -u origin main
            echo.
            echo [OK] Projekt postavljen na GitHub!
            echo.
            echo Otvori repozitorij na: %gitUrl%
        ) else (
            echo Preskacem push. Možeš kasnije pokrenuti:
            echo   git push -u origin main
        )
    ) else (
        echo Preskacem remote setup. Možeš kasnije dodati:
        echo   git remote add origin [TvojGitHubURL]
        echo   git push -u origin main
    )
)

echo.
echo ====================================
echo GOTOVO!
echo ====================================
pause










