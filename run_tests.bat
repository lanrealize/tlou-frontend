@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ============================================================
echo 🧪 运行所有测试
echo ============================================================
echo.

set "TOTAL_TESTS=0"
set "PASSED_TESTS=0"
set "FAILED_TESTS=0"

REM 测试列表
set "TEST_1=tests\test_cases\test_unlogged.py"
set "TEST_2=tests\test_cases\test_login.py"
set "TEST_3=tests\test_cases\test_complete_user_flow.py"
set "TEST_4=tests\test_cases\test_virtual_user_helper.py"

REM 运行测试1
echo.
echo [1/4] 运行未登录用户权限测试...
echo ------------------------------------------------------------
python %TEST_1%
if !ERRORLEVEL! EQU 0 (
    set /a PASSED_TESTS+=1
    echo ✅ test_unlogged.py - PASSED
) else (
    set /a FAILED_TESTS+=1
    echo ❌ test_unlogged.py - FAILED
)
set /a TOTAL_TESTS+=1

REM 运行测试2
echo.
echo [2/4] 运行登录测试...
echo ------------------------------------------------------------
python %TEST_2%
if !ERRORLEVEL! EQU 0 (
    set /a PASSED_TESTS+=1
    echo ✅ test_login.py - PASSED
) else (
    set /a FAILED_TESTS+=1
    echo ❌ test_login.py - FAILED
)
set /a TOTAL_TESTS+=1

REM 运行测试3
echo.
echo [3/4] 运行完整用户流程测试...
echo ------------------------------------------------------------
python %TEST_3%
if !ERRORLEVEL! EQU 0 (
    set /a PASSED_TESTS+=1
    echo ✅ test_complete_user_flow.py - PASSED
) else (
    set /a FAILED_TESTS+=1
    echo ❌ test_complete_user_flow.py - FAILED
)
set /a TOTAL_TESTS+=1

REM 运行测试4
echo.
echo [4/4] 运行虚拟用户助手测试...
echo ------------------------------------------------------------
python %TEST_4%
if !ERRORLEVEL! EQU 0 (
    set /a PASSED_TESTS+=1
    echo ✅ test_virtual_user_helper.py - PASSED
) else (
    set /a FAILED_TESTS+=1
    echo ❌ test_virtual_user_helper.py - FAILED
)
set /a TOTAL_TESTS+=1

REM 输出总结
echo.
echo ============================================================
echo 📊 测试总结
echo ============================================================
echo 总共测试: !TOTAL_TESTS!
echo ✅ 通过: !PASSED_TESTS!
echo ❌ 失败: !FAILED_TESTS!
echo ------------------------------------------------------------

if !FAILED_TESTS! EQU 0 (
    echo 🎉 所有测试通过！
    set "EXIT_CODE=0"
) else (
    echo ⚠️  有测试失败，请检查日志
    set "EXIT_CODE=1"
)
echo ============================================================
echo.

exit /b !EXIT_CODE!
