$root = Split-Path -Path $PSScriptRoot -Parent

Start-Process -FilePath "powershell.exe" `
  -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $PSScriptRoot "start-local-auth.ps1") `
  -WorkingDirectory (Join-Path $root "flora-fauna\\backend") `
  -RedirectStandardOutput (Join-Path $PSScriptRoot "local-auth.stdout.log") `
  -RedirectStandardError (Join-Path $PSScriptRoot "local-auth.stderr.log")

Start-Process -FilePath "powershell.exe" `
  -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $PSScriptRoot "start-local-impact.ps1") `
  -WorkingDirectory (Join-Path $root "services\\impact-service") `
  -RedirectStandardOutput (Join-Path $PSScriptRoot "local-impact.stdout.log") `
  -RedirectStandardError (Join-Path $PSScriptRoot "local-impact.stderr.log")

Start-Process -FilePath "powershell.exe" `
  -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $PSScriptRoot "start-local-frontend.ps1") `
  -WorkingDirectory (Join-Path $root "frontend-next") `
  -RedirectStandardOutput (Join-Path $PSScriptRoot "local-frontend.stdout.log") `
  -RedirectStandardError (Join-Path $PSScriptRoot "local-frontend.stderr.log")
