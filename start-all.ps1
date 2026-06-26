# 启动餐饮推荐全套：Express 3000 + Agent 8001 + Web 5174
$root = $PSScriptRoot
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root\smart-ordering-system'; node app.js" -WindowStyle Normal
Start-Sleep 2
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root\recommend-agent'; if (Test-Path .\.venv\Scripts\python.exe) { .\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 } else { python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 }" -WindowStyle Normal
Start-Sleep 3
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root\agent-web'; .\start-dev.ps1" -WindowStyle Normal
Write-Host "已打开三个窗口。浏览器访问 http://127.0.0.1:5174" -ForegroundColor Cyan
