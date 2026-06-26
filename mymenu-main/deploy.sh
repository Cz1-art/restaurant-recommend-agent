#!/bin/bash

# MyMenu 项目部署脚本
# 帮助用户将项目推送到GitHub

echo "========================================="
echo "MyMenu 微信小程序 - GitHub 部署脚本"
echo "========================================="
echo ""

# 检查是否安装了git
if ! command -v git &> /dev/null; then
    echo "错误: 未找到git，请先安装git"
    exit 1
fi

echo "步骤 1: 在GitHub上创建仓库"
echo "请访问: https://github.com/new"
echo "仓库名称: mymenu"
echo "描述: 微信小程序饭店菜单点餐系统"
echo "选择: Public"
echo "不要初始化README"
echo ""

read -p "按 Enter 继续 (创建仓库后)..."

echo ""
echo "步骤 2: 推送代码到GitHub"
echo ""

# 检查远程仓库是否已配置
cd "$(dirname "$0")"
if git remote get-url origin &> /dev/null; then
    echo "远程仓库已配置: $(git remote get-url origin)"
    echo ""
    read -p "是否重新配置? (y/n): " reconfigure
    if [ "$reconfigure" = "y" ] || [ "$reconfigure" = "Y" ]; then
        echo ""
        read -p "请输入GitHub仓库URL: " repo_url
        git remote set-url origin "$repo_url"
    fi
else
    echo "请输入您的GitHub仓库URL (例如: https://github.com/您的用户名/mymenu.git)"
    read repo_url
    git remote add origin "$repo_url"
fi

echo ""
echo "步骤 3: 推送到GitHub"
echo ""

# 推送代码
if git push -u origin main 2>/dev/null || git push -u origin master 2>/dev/null; then
    echo ""
    echo "========================================="
    echo "✓ 推送成功!"
    echo "========================================="
    echo ""
    echo "您的项目已推送到GitHub:"
    git remote get-url origin
    echo ""
    echo "接下来:"
    echo "1. 打开微信开发者工具"
    echo "2. 导入项目: $(pwd)"
    echo "3. 编译运行"
else
    echo ""
    echo "推送失败，请检查:"
    echo "1. GitHub仓库是否存在"
    echo "2. 网络连接"
    echo "3. 认证信息 (可能需要输入用户名和密码或使用Personal Access Token)"
fi
