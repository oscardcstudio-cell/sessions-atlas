@echo off
cd /d "%~dp0"
echo [Sessions Atlas] Demarrage...

:: Install backend si besoin (premiere fois)
if not exist "webui\backend\node_modules" (
  echo Installation deps backend ^(premiere fois^)...
  cd webui\backend && npm install
  cd ..\..
)

:: Lancer les 3 serveurs (fenetres minimisees en fond)
start /MIN "Atlas-5199" cmd /k "cd /d %~dp0 && node server.mjs"
start /MIN "WebUI-Backend-8080" cmd /k "cd /d %~dp0webui\backend && npm run dev"
start /MIN "WebUI-Frontend-3000" cmd /k "cd /d %~dp0webui\frontend && npm run dev"

:: Attendre que les serveurs demarrent
timeout /t 5 /nobreak >nul

:: Ouvrir les deux interfaces
start http://localhost:5199
start http://localhost:3000
