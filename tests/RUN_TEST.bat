@echo off
chcp 65001 >nul
echo ========================================
echo 运行未登录用户测试
echo ========================================
echo.

cd /d %~dp0..
python tests\test_cases\test_unlogged.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ 测试通过
) else (
    echo.
    echo ❌ 测试失败
)

pause
