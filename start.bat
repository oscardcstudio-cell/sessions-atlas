@echo off
cd /d "%~dp0"
echo Demarrage Atlas + WebUI...

start "Atlas (5199)" cmd /k "node server.mjs"
start "WebUI Backend (8080)" cmd /k "cd webui\backend && npm run dev"
start "WebUI Frontend (3000)" cmd /k "cd webui\frontend && npm run dev"

timeout /t 4 /nobreak >nul
start http://localhost:5199
start http://localhost:3000
