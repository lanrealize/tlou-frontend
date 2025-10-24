@echo off
chcp 65001 >nul
python tests\test_cases\test_unlogged.py
python tests\test_cases\test_login.py
python tests\test_cases\test_complete_user_flow.py
pause

