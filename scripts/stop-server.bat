@echo off
echo ========================================
echo �T�[�o�[���~���Ă��܂�...
echo ========================================
echo.

REM �|�[�g8000�œ��삵�Ă���v���Z�X���������ďI��
echo �|�[�g8000�œ��삵�Ă���v���Z�X��������...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    echo �v���Z�XID %%a ���I�����Ă��܂�...
    taskkill /PID %%a /F >nul 2>&1
    if !errorlevel! equ 0 (
        echo [OK] �v���Z�XID %%a �𐳏�ɏI�����܂���
    ) else (
        echo [NG] �v���Z�XID %%a �̏I���Ɏ��s���܂���
    )
)

REM http-server�v���Z�X�𒼐ڌ������ďI��
echo http-server�v���Z�X��������...
tasklist /FI "IMAGENAME eq node.exe" /FO CSV | findstr /I "http-server" >nul 2>&1
if %errorlevel% equ 0 (
    echo http-server�v���Z�X���I�����Ă��܂�...
    taskkill /IM node.exe /F >nul 2>&1
    echo [OK] http-server�v���Z�X���I�����܂���
)

REM �|�[�g8000��������ꂽ���m�F
timeout /t 2 /nobreak >nul
netstat -ano | findstr :8000 >nul 2>&1
if %errorlevel% neq 0 (
    echo [OK] �|�[�g8000���������܂���
) else (
    echo [NG] �|�[�g8000���܂��g�p���ł�
)

echo.
echo �T�[�o�[����~����܂����B
pause
