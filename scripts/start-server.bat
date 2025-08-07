@echo off
echo ========================================
echo 電話応対報告文作成補助サイトを起動しています...
echo ========================================
echo.

REM 現在のディレクトリを確認
echo 現在のディレクトリ: %CD%
echo.

REM index.htmlファイルの存在確認
if not exist "index.html" (
    echo エラー: index.htmlファイルが見つかりません！
    echo 現在のディレクトリにindex.htmlがあることを確認してください。
    pause
    exit /b 1
)
echo [OK] index.htmlファイルが見つかりました
echo.

REM http-serverがインストールされているかチェック
echo http-serverの確認中...
call npx http-server --version >nul 2>&1
if %errorlevel% neq 0 (
    echo http-serverが見つかりません。インストールしています...
    call npm install -g http-server
    if %errorlevel% neq 0 (
        echo エラー: http-serverのインストールに失敗しました
        pause
        exit /b 1
    )
)
echo [OK] http-serverが利用可能です
echo.

REM ポート8000が使用中かチェック
echo ポート8000の確認中...
netstat -ano | findstr :8000 >nul 2>&1
if %errorlevel% equ 0 (
    echo 警告: ポート8000は既に使用されています
    echo 別のポートを使用するか、既存のプロセスを停止してください
    pause
    exit /b 1
)
echo [OK] ポート8000は利用可能です
echo.

echo ========================================
echo サーバーを起動しています...
echo ブラウザで http://localhost:8000 を開いてください
echo ========================================
echo.
echo サーバーを停止するには Ctrl+C を押してください
echo.

REM ブラウザを自動的に開く（少し遅延を入れてサーバー起動を待つ）
timeout /t 2 /nobreak >nul
start http://localhost:8000

REM サーバーを起動
call npx http-server -p 8000 --cors

pause
