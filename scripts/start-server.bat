@echo off
echo ========================================
echo �d�b���Ε񍐕��쐬�⏕�T�C�g���N�����Ă��܂�...
echo ========================================
echo.

REM ���݂̃f�B���N�g�����m�F
echo ���݂̃f�B���N�g��: %CD%
echo.

REM index.html�t�@�C���̑��݊m�F
if not exist "index.html" (
    echo �G���[: index.html�t�@�C����������܂���I
    echo ���݂̃f�B���N�g����index.html�����邱�Ƃ��m�F���Ă��������B
    pause
    exit /b 1
)
echo [OK] index.html�t�@�C����������܂���
echo.

REM http-server���C���X�g�[������Ă��邩�`�F�b�N
echo http-server�̊m�F��...
call npx http-server --version >nul 2>&1
if %errorlevel% neq 0 (
    echo http-server��������܂���B�C���X�g�[�����Ă��܂�...
    call npm install -g http-server
    if %errorlevel% neq 0 (
        echo �G���[: http-server�̃C���X�g�[���Ɏ��s���܂���
        pause
        exit /b 1
    )
)
echo [OK] http-server�����p�\�ł�
echo.

REM �|�[�g8000���g�p�����`�F�b�N
echo �|�[�g8000�̊m�F��...
netstat -ano | findstr :8000 >nul 2>&1
if %errorlevel% equ 0 (
    echo �x��: �|�[�g8000�͊��Ɏg�p����Ă��܂�
    echo �ʂ̃|�[�g���g�p���邩�A�����̃v���Z�X���~���Ă�������
    pause
    exit /b 1
)
echo [OK] �|�[�g8000�͗��p�\�ł�
echo.

echo ========================================
echo �T�[�o�[���N�����Ă��܂�...
echo �u���E�U�� http://localhost:8000 ���J���Ă�������
echo ========================================
echo.
echo �T�[�o�[���~����ɂ� Ctrl+C �������Ă�������
echo.

REM �u���E�U�������I�ɊJ���i�����x�������ăT�[�o�[�N����҂j
timeout /t 2 /nobreak >nul
start http://localhost:8000

REM �T�[�o�[���N��
call npx http-server -p 8000 --cors

pause
