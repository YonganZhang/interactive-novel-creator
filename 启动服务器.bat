@echo off
chcp 65001 >nul
echo ========================================
echo   交互式小说创作系统
echo ========================================
echo.
echo 正在启动本地服务器...
echo.
echo 服务器地址: http://localhost:8080
echo.
echo 按 Ctrl+C 停止服务器
echo.
echo ========================================
echo.

cd /d "%~dp0"
python -m http.server 8080

pause
