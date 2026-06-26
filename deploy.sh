#!/bin/bash
# ===================================================
# 风味餐厅智能推荐 Agent - 一键部署脚本
# 用法: bash deploy.sh
# ===================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  风味餐厅智能推荐 Agent - 部署${NC}"
echo -e "${GREEN}============================================${NC}"

# 1. 检查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}[1/3] 安装 Docker...${NC}"
    curl -fsSL https://get.docker.com | bash
    systemctl enable docker && systemctl start docker
else
    echo -e "${GREEN}[1/3] Docker 已安装 ✓${NC}"
fi

# 2. 配置 .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}[2/3] 创建 .env，请填入 API Key 后重新运行${NC}"
    cp .env.example .env
    echo -e "${RED}   → 编辑 .env 填入: DIFY_API_KEY, AMAP_API_KEY, DEEPSEEK_API_KEY${NC}"
    exit 1
fi
echo -e "${GREEN}[2/3] .env 已配置 ✓${NC}"

# 3. 启动
echo -e "${YELLOW}[3/3] 构建并启动...${NC}"
docker compose up -d --build

sleep 3
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}============================================${NC}"
IP=$(hostname -I | awk '{print $1}')
echo -e "访问:  http://${IP}"
echo -e "健康:  curl http://${IP}/health"
echo -e ""
echo -e "日志:  docker compose logs -f agent"
echo -e "重启:  docker compose restart"
echo -e "停止:  docker compose down"
