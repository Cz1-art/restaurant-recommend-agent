# 一键启动餐饮 Agent 前端（与 medical 一样固定 127.0.0.1:5174）
Set-Location $PSScriptRoot
if (-not (Test-Path node_modules)) { npm install }
Write-Host "启动 Vite -> http://127.0.0.1:5174" -ForegroundColor Green
Write-Host "请确保 8001(recommend-agent) 和 3000(express) 已启动" -ForegroundColor Yellow
npm run dev
