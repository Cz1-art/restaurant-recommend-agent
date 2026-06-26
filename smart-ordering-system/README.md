# 智能点餐系统 - 后端服务

基于 Express + MySQL 的智能点餐系统后端，为微信小程序前端提供 RESTful API 接口。

## 功能特性

- 用户认证（注册/登录/JWT）
- 菜品分类管理（CRUD）
- 菜品管理（CRUD、上下架、搜索）
- 购物车（增删改查、数量调整）
- 订单管理（下单、状态流转、历史查询）
- 文件上传（菜品图片）
- 数据统计（订单统计、营业额）
- 权限管理（管理员/顾客角色）

## 技术栈

- **框架**: Express.js
- **数据库**: MySQL 8.0+
- **认证**: JWT (jsonwebtoken) + bcryptjs
- **文件上传**: multer
- **环境变量**: dotenv

## 快速开始

### 1. 安装依赖

```bash
cd smart-ordering-system
npm install
```

### 2. 配置数据库

修改 `.env` 文件中的数据库连接信息：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的密码
DB_NAME=smart_ordering
```

### 3. 初始化数据库

```bash
npm run init-db
```

或手动执行 `scripts/init-db.sql`。

### 4. 启动服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务默认运行在 `http://localhost:3000`

### 5. 默认账号

- 管理员: `admin` / `admin123`

## API 接口文档

### 统一响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

- `code: 0` 表示成功，非0表示失败
- 错误时 `code` 为 HTTP 状态码

### 认证相关 `/api/users`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/users/register` | 用户注册 | 公开 |
| POST | `/api/users/login` | 用户登录 | 公开 |
| GET | `/api/users/profile` | 获取个人信息 | 登录 |
| PUT | `/api/users/profile` | 更新个人信息 | 登录 |
| GET | `/api/users` | 用户列表 | 管理员 |

### 分类管理 `/api/categories`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/categories` | 获取所有分类 | 公开 |
| GET | `/api/categories/:id` | 获取分类详情 | 公开 |
| POST | `/api/categories` | 添加分类 | 管理员 |
| PUT | `/api/categories/:id` | 更新分类 | 管理员 |
| DELETE | `/api/categories/:id` | 删除分类 | 管理员 |

### 菜品管理 `/api/dishes`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/dishes?categoryId=&status=&keyword=` | 获取菜品列表 | 公开 |
| GET | `/api/dishes/:id` | 获取菜品详情 | 公开 |
| POST | `/api/dishes` | 添加菜品 | 管理员 |
| PUT | `/api/dishes/:id` | 更新菜品 | 管理员 |
| DELETE | `/api/dishes/:id` | 删除菜品 | 管理员 |

### 购物车 `/api/cart`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/cart` | 获取购物车 | 登录 |
| POST | `/api/cart` | 添加到购物车 | 登录 |
| PUT | `/api/cart/:dishId` | 更新数量 | 登录 |
| DELETE | `/api/cart/:dishId` | 删除购物车项 | 登录 |
| DELETE | `/api/cart` | 清空购物车 | 登录 |

### 订单管理 `/api/orders`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/orders` | 创建订单（从购物车结算） | 登录 |
| GET | `/api/orders/my?status=&page=&pageSize=` | 我的订单 | 登录 |
| GET | `/api/orders?status=&page=&pageSize=` | 所有订单 | 管理员 |
| GET | `/api/orders/:id` | 订单详情 | 登录 |
| PUT | `/api/orders/:id/status` | 更新订单状态 | 管理员 |

### 文件上传 `/api/upload`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/upload` | 上传图片 | 管理员 |

### 统计 `/api/stats`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/stats` | 获取统计数据 | 管理员 |

### 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 服务健康检查 |

## 订单状态流转

```
待处理(pending) → 制作中(cooking) → 已完成(done)
     ↓
  已取消(cancelled)
```

## 项目结构

```
smart-ordering-system/
├── app.js                  # 应用入口
├── package.json            # 项目配置
├── .env                    # 环境变量配置
├── .gitignore
├── scripts/
│   ├── init-db.js          # 数据库初始化脚本
│   └── init-db.sql         # 数据库建表SQL
├── middleware/
│   ├── auth.js             # JWT认证中间件
│   └── error.js            # 错误处理中间件
├── models/
│   ├── db.js               # 数据库连接池
│   ├── category.js         # 分类模型
│   ├── dish.js             # 菜品模型
│   ├── cart.js             # 购物车模型
│   ├── order.js            # 订单模型
│   └── user.js             # 用户模型
├── routes/
│   ├── categories.js       # 分类路由
│   ├── dishes.js           # 菜品路由
│   ├── cart.js             # 购物车路由
│   ├── orders.js           # 订单路由
│   ├── users.js            # 用户路由
│   ├── upload.js           # 文件上传路由
│   └── stats.js            # 统计路由
└── uploads/                # 上传文件目录
```

## 前端对接说明

前端小程序需要将所有 `wx.getStorageSync` / `wx.setStorageSync` 替换为 `wx.request` 调用后端API：

1. 在 `app.js` 中配置后端地址：`const BASE_URL = 'http://localhost:3000/api'`
2. 登录后将 token 存入 Storage，请求时在 header 中携带 `Authorization: Bearer <token>`
3. 所有数据操作改为调用对应的后端接口

## License

MIT
