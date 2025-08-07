@echo off
echo ========================================
echo サーバーを停止しています...
echo ========================================
echo.

REM ポート8000で動作しているプロセスを検索して終了
echo ポート8000で動作しているプロセスを検索中...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    echo プロセスID %%a を終了しています...
    taskkill /PID %%a /F >nul 2>&1
    if !errorlevel! equ 0 (
        echo [OK] プロセスID %%a を正常に終了しました
    ) else (
        echo [NG] プロセスID %%a の終了に失敗しました
    )
)

REM http-serverプロセスを直接検索して終了
echo http-serverプロセスを検索中...
tasklist /FI "IMAGENAME eq node.exe" /FO CSV | findstr /I "http-server" >nul 2>&1
if %errorlevel% equ 0 (
    echo http-serverプロセスを終了しています...
    taskkill /IM node.exe /F >nul 2>&1
    echo [OK] http-serverプロセスを終了しました
)

REM ポート8000が解放されたか確認
timeout /t 2 /nobreak >nul
netstat -ano | findstr :8000 >nul 2>&1
if %errorlevel% neq 0 (
    echo [OK] ポート8000が解放されました
) else (
    echo [NG] ポート8000がまだ使用中です
)

echo.
echo サーバーが停止されました。
pause
