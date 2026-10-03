# Opens the backend and frontend dev servers in two PowerShell windows.
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'

if (-not (Test-Path (Join-Path $backend '.venv\Scripts\python.exe'))) {
  Write-Host 'Backend venv missing. Run: cd backend; python -m venv .venv; .\.venv\Scripts\python.exe -m pip install -r requirements.txt' -ForegroundColor Yellow
  exit 1
}
if (-not (Test-Path (Join-Path $frontend 'node_modules'))) {
  Write-Host 'Frontend dependencies missing. Run: cd frontend; npm install' -ForegroundColor Yellow
  exit 1
}
if (-not (Test-Path (Join-Path $backend '.env'))) {
  Copy-Item (Join-Path $backend '.env.example') (Join-Path $backend '.env')
  Write-Host 'Created backend\.env from .env.example (Demo mode). Add ANTHROPIC_API_KEY for AI mode.' -ForegroundColor Cyan
}

Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$backend'; .\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$frontend'; npm run dev"
Write-Host 'Backend: http://localhost:8000/health   Frontend: http://localhost:5173   Dashboard: http://localhost:5173/#dashboard' -ForegroundColor Green
