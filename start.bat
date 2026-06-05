@echo off
setlocal
cd /d "%~dp0"
echo [Sessions Atlas] Demarrage...

:: Liberer les ports si deja occupes (relance propre)
echo Nettoyage des ports 3000 / 8080...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8080 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

:: Generer atlas-index.json (source de verite sessions)
echo Generation atlas-index.json...
node generate-atlas.mjs >nul 2>&1

:: Install backend si besoin (premiere fois)
:: "call" obligatoire : npm est un .cmd, sans call le script s'arrete apres
if not exist "webui\backend\node_modules" (
  echo Installation deps backend ^(premiere fois, ~30s^)...
  pushd "webui\backend"
  call npm install
  popd
)

:: Install frontend si besoin (premiere fois)
if not exist "webui\frontend\node_modules" (
  echo Installation deps frontend ^(premiere fois, ~30s^)...
  pushd "webui\frontend"
  call npm install
  popd
)

:: Lancer backend + frontend (fenetres minimisees en fond)
start /MIN "WebUI-Backend-8080" cmd /k "cd /d %~dp0webui\backend && npm run dev"
start /MIN "WebUI-Frontend-3000" cmd /k "cd /d %~dp0webui\frontend && npm run dev"

:: Attendre que le backend soit pret (compile TypeScript au demarrage)
echo En attente du backend...
:waitloop
curl -s http://localhost:8080/api/projects >nul 2>&1
if errorlevel 1 (
  timeout /t 2 /nobreak >nul
  goto waitloop
)

:: Backend pret — attendre 2s que le frontend Vite soit aussi pret
timeout /t 2 /nobreak >nul

:: Ouvrir l'interface integree (sidebar + chat)
start http://localhost:3000
