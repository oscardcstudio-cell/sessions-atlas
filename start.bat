@echo off
setlocal
cd /d "%~dp0"
echo [Sessions Atlas] Demarrage...

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

:: Lancer les 3 serveurs (fenetres minimisees en fond)
:: pas de guillemets autour de %~dp0 dans la chaine cmd /k (pas d'espaces dans le path)
start /MIN "Atlas-5199" cmd /k "cd /d %~dp0 && node server.mjs"
start /MIN "WebUI-Backend-8080" cmd /k "cd /d %~dp0webui\backend && npm run dev"
start /MIN "WebUI-Frontend-3000" cmd /k "cd /d %~dp0webui\frontend && npm run dev"

:: Attendre que les serveurs demarrent (backend compile TS ~5s)
timeout /t 8 /nobreak >nul

:: Ouvrir les deux interfaces
start http://localhost:5199
start http://localhost:3000
