const express = require('express');
const router = express.Router();
const Review = require('../models/review');
const { authMiddleware, staffMiddleware } = require('../middleware/auth');

// 获取菜品评价
router.get('/dish/:dishId', async (req, res) => {
  res.json({ code: 0, data: Review.findByDish(req.params.dishId) });
});

// 获取菜品评价统计
router.get('/dish/:dishId/stats', async (req, res) => {
  const stats = Review.getStats(req.params.dishId);
  res.json({ code: 0, data: stats });
});

// 提交评价（需登录+已完成的订单）
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { dish_id, order_id, rating, content } = req.body;
    if (!dish_id || !order_id || !rating) return res.status(400).json({ code: 400, message: '参数不完整' });
    if (rating < 1 || rating > 5) return res.status(400).json({ code: 400, message: '评分范围为1-5' });
    const review = Review.create(req.user.id, dish_id, order_id, rating, content);
    res.json({ code: 0, message: '评价成功', data: review });
  } catch (err) { next(err); }
});

// 获取我的评价
router.get('/mine', authMiddleware, (req, res) => {
  res.json({ code: 0, data: Review.findByUser(req.user.id) });
});

// 所有评价（员工）
router.get('/', authMiddleware, staffMiddleware, (req, res) => {
  res.json({ code: 0, data: Review.findAll() });
});

// 全局评价统计（员工）
router.get('/stats/global', authMiddleware, staffMiddleware, (req, res) => {
  res.json({ code: 0, data: Review.getGlobalStats() });
});

module.exports = router;
