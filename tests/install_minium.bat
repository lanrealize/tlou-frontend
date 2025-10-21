@echo off
chcp 65001 > nul
echo.
echo ========================================
echo 安装 Minium 自动化测试框架
echo ========================================
echo.
echo 正在安装 minium（使用国内源加速）...
echo.
pip install minium -i https://pypi.tuna.tsinghua.edu.cn/simple
echo.
echo ========================================
echo 安装完成！
echo ========================================
echo.
echo 下一步：运行测试
echo   python tests\minium_test.py
echo.
pause

