require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const categoryRouter = require('./routes/categories');
const dishRouter = require('./routes/dishes');
const cartRouter = require('./routes/cart');
const orderRouter = require('./routes/orders');
const userRouter = require('./routes/users');
const uploadRouter = require('./routes/upload');
const statsRouter = require('./routes/stats');
const chatRouter = require('./routes/chat');
const favoriteRouter = require('./routes/favorites');
const reviewRouter = require('./routes/reviews');
const tableRouter = require('./routes/tables');
const paymentRouter = require('./routes/payments');

const { errorMiddleware } = require('./middleware/error');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 上传的图片
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Web 管理后台
app.use('/admin', express.static(path.join(__dirname, 'admin-web')));

// API路由
app.use('/api/categories', categoryRouter);
app.use('/api/dishes', dishRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);
app.use('/api/users', userRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/stats', statsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/favorites', favoriteRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/tables', tableRouter);
app.use('/api/payments', paymentRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ code: 0, message: '智能点餐系统后端服务运行中', time: new Date().toLocaleString() });
});

// 错误处理中间件
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`  智能点餐系统后端服务已启动`);
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`  API文档: http://localhost:${PORT}/api/health`);
  console.log(`=================================`);
});
